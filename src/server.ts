/* --------------------------------------------------------------------------------------------
 * Copyright (c) Pavel Odvody 2016
 * Licensed under the Apache-2.0 License. See License.txt in the project root for license information.
 * ------------------------------------------------------------------------------------------ */
'use strict';
import * as path from 'path';
import * as fs from 'fs';
import {
	IPCMessageReader, IPCMessageWriter, createConnection, IConnection,
	TextDocuments, Diagnostic, InitializeResult, CodeLens, Command, RequestHandler, CodeActionParams
} from 'vscode-languageserver';
import { stream_from_string } from './utils';
import { DependencyCollector, IDependency, PomXmlDependencyCollector, ReqDependencyCollector } from './collector';
import { EmptyResultEngine, SecurityEngine, DiagnosticsPipeline, codeActionsMap } from './consumers';

import { EmptyResultEngineSenti, SecurityEngineSenti, DiagnosticsPipelineSenti, codeActionsMapSenti } from './sentiment';

const url = require('url');
const https = require('https');
const http = require('http');
const request = require('request');
const winston = require('winston');

 winston.level = 'debug';
 winston.add(winston.transports.File, { filename: '/workspace-logs/ls-bayesian/bayesian.log' });
 winston.remove(winston.transports.Console);
 winston.info('Starting Bayesian');

/*
let log_file = fs.openSync('file_log.log', 'w');
let _LOG = (data) => {
    fs.writeFileSync('file_log.log', data + '\n');
}
*/

enum EventStream {
  Invalid,
  Diagnostics,
  CodeLens
};

let connection: IConnection = null;
/* use stdio for transfer if applicable */
if (process.argv.indexOf('--stdio') == -1)
    connection = createConnection(new IPCMessageReader(process), new IPCMessageWriter(process));
else
    connection = createConnection()

let documents: TextDocuments = new TextDocuments();
documents.listen(connection);

let workspaceRoot: string;
connection.onInitialize((params): InitializeResult => {
    workspaceRoot = params.rootPath;
    return {
        capabilities: {
            textDocumentSync: documents.syncKind,
            codeActionProvider: true
        }
    }
});

interface IFileHandlerCallback {
    (uri: string, name: string, contents: string): void;
};

interface IAnalysisFileHandler {
    matcher:  RegExp;
    stream: EventStream;
    callback: IFileHandlerCallback;
};

interface IAnalysisFiles {
    handlers: Array<IAnalysisFileHandler>;
    file_data: Map<string, string>;
    on(stream: EventStream, matcher: string, cb: IFileHandlerCallback): IAnalysisFiles;
    run(stream: EventStream, uri: string, file: string, contents: string): any;
};

class AnalysisFileHandler implements IAnalysisFileHandler {
    matcher: RegExp;
    constructor(matcher: string, public stream: EventStream, public callback: IFileHandlerCallback) {
        this.matcher = new RegExp(matcher);
    }
};

class AnalysisFiles implements IAnalysisFiles {
    handlers: Array<IAnalysisFileHandler>;
    file_data: Map<string, string>;
    constructor() {
        this.handlers = [];
        this.file_data = new Map<string, string>();
    }
    on(stream: EventStream, matcher: string, cb: IFileHandlerCallback): IAnalysisFiles {
        this.handlers.push(new AnalysisFileHandler(matcher, stream, cb));
        return this;
    }
    run(stream: EventStream, uri: string, file: string, contents: string): any {
        for (let handler of this.handlers) {
            if (handler.stream == stream && handler.matcher.test(file)) {
                return handler.callback(uri, file, contents);
            }
        }
    }
};

interface IAnalysisLSPServer
{
    connection: IConnection;
    files:      IAnalysisFiles;

    handle_file_event(uri: string, contents: string): void;
    handle_code_lens_event(uri: string): CodeLens[];
};

class AnalysisLSPServer implements IAnalysisLSPServer {
    constructor(public connection: IConnection, public files: IAnalysisFiles) {}

    handle_file_event(uri: string, contents: string): void {
        let path_name = url.parse(uri).pathname;
        let file_name = path.basename(path_name);

        this.files.file_data[uri] = contents;

        this.files.run(EventStream.Diagnostics, uri, file_name, contents);
    }

    handle_code_lens_event(uri: string): CodeLens[] {
        let path_name = url.parse(uri).pathname;
        let file_name = path.basename(path_name);
        let lenses = [];
        let contents = this.files.file_data[uri];
        return this.files.run(EventStream.CodeLens, uri, file_name, contents);
    }
};

interface IAggregator
{
    callback: any;
    is_ready(): boolean;
    aggregate(IDependency): void;
};

class Aggregator implements IAggregator
{
    mapping: Map<IDependency, boolean>;
    diagnostics: Array<Diagnostic>;
    constructor(items: Array<IDependency>, public callback: any){
        this.mapping = new Map<IDependency, boolean>();
        for (let item of items) {
            this.mapping.set(item, false);
        }
    }
    is_ready(): boolean {
        let val = true;
        for (let m of this.mapping.entries()) {
            val = val && m[1];
        }
        return val;
    }
    aggregate(dep: IDependency): void {
        this.mapping.set(dep, true);
        if (this.is_ready()) {
            this.callback();
        }
    }
};

class AnalysisConfig
{
    server_url:         string;
    api_token:          string;
    forbidden_licenses: Array<string>;
    no_crypto:          boolean;
    home_dir:           string;

    constructor() {
        // TODO: this needs to be configurable
        this.server_url = process.env.RECOMMENDER_API_URL || "api-url-not-available-in-lsp";
        this.api_token = process.env.RECOMMENDER_API_TOKEN || "token-not-available-in-lsp";
        this.forbidden_licenses = [];
        this.no_crypto = false;
        this.home_dir = process.env[(process.platform == 'win32') ? 'USERPROFILE' : 'HOME'];
    }
};

let config: AnalysisConfig = new AnalysisConfig();
let files: IAnalysisFiles = new AnalysisFiles();
let server: IAnalysisLSPServer = new AnalysisLSPServer(connection, files);
let rc_file = path.join(config.home_dir, '.analysis_rc');
if (fs.existsSync(rc_file)) {
    let rc = JSON.parse(fs.readFileSync(rc_file, 'utf8'));
    if ('server' in rc) {
        config.server_url = `${rc.server}/api/v1`;
    }
}

let DiagnosticsEngines = [SecurityEngine];

let DiagnosticsEnginesSenti = [SecurityEngineSenti];

// TODO: in-memory caching only, this needs to be more robust
let metadataCache = new Map();

let get_metadata = (ecosystem, name, version, cb) => {
    let cacheKey = ecosystem + " " + name + " " + version;
    let metadata = metadataCache[cacheKey];
    if (metadata != null) {
        winston.info('cache hit for ' + cacheKey);
        cb(metadata);
        return
    }
    let part = [ecosystem, name, version].join('/');

    const options = url.parse(config.server_url);
    options['path'] += `/component-analyses/${part}/`;
    options['headers'] = {'Authorization': 'Bearer ' + config.api_token};
    winston.debug('get ' + options['host'] + options['path']);
    https.get(options, function(res){
        let body = '';
        res.on('data', function(chunk) { 
            winston.debug('chunk ' + chunk);
            body += chunk; 
        });
        res.on('end', function(){
            winston.info('status recommend' + this.statusCode);
            if (this.statusCode == 200 || this.statusCode == 202) {
                let response = JSON.parse(body);
                winston.debug('response ' + response);
                metadataCache[cacheKey] = response;
                cb(response);
            } else {
                cb(null);
            }
        });
    }).on('error', function(e) {
        winston.info("Got error: " + e.message);
    });
};

let sentiment_api_call = (ecosystem, name, version, cb) =>{
    winston.debug("get sentiment"+name);
    http.get("http://sentiment-http-sentiment-score.dev.rdu2c.fabric8.io/api/v1.0/getsentimentanalysis/?package="+name, function(res){
        let body = '';
        res.on('data', function(chunk) { 
            winston.debug('chunk ' + chunk);
            body += chunk;
        });
        res.on('end', function(){
            winston.info('status sentiment ' + this.statusCode);
            if (this.statusCode == 200 || this.statusCode == 202) {
                let response = JSON.parse(body);
                winston.debug('response sentiment' + response);
                //metadataCache[cacheKey] = response;
                cb(response);
            } else {
                cb(null);
            }
        });
    }).on('error', function(e) {
        winston.info("Got error sentiment: " + e.message);
    });
}


files.on(EventStream.Diagnostics, "^package\\.json$", (uri, name, contents) => {
    /* Convert from readable stream into string */
    let stream = stream_from_string(contents);
    let collector = new DependencyCollector(null);

    collector.collect(stream).then((deps) => {
        let diagnostics = [];
        /* Aggregate asynchronous requests and send the diagnostics at once */
        let aggregator = new Aggregator(deps, () => {
            connection.sendDiagnostics({uri: uri, diagnostics: diagnostics});
        });
        for (let dependency of deps) {
            get_metadata('npm', dependency.name.value, dependency.version.value, (response) => {
                if (response != null) {
                    let pipeline = new DiagnosticsPipeline(DiagnosticsEngines, dependency, config, diagnostics);
                    pipeline.run(response);
                }
                aggregator.aggregate(dependency);
            });
            //TODO :: sentiment analysis
            sentiment_api_call('npm', dependency.name.value, dependency.version.value, (response) => {
                if (response != null) {
                    let pipeline = new DiagnosticsPipelineSenti(DiagnosticsEnginesSenti, dependency, config, diagnostics);
                    pipeline.run(response);
                }
                aggregator.aggregate(dependency);
            });

        }
    });
});

files.on(EventStream.Diagnostics, "^pom\\.xml$", (uri, name, contents) => {
    /* Convert from readable stream into string */
    let stream = stream_from_string(contents);
    let collector = new PomXmlDependencyCollector();

    collector.collect(stream).then((deps) => {
        let diagnostics = [];
        /* Aggregate asynchronous requests and send the diagnostics at once */
        let aggregator = new Aggregator(deps, () => {
            connection.sendDiagnostics({uri: uri, diagnostics: diagnostics});
        });
        for (let dependency of deps) {
            get_metadata('maven', dependency.name.value, dependency.version.value, (response) => {
                if (response != null) {
                    let pipeline = new DiagnosticsPipeline(DiagnosticsEngines, dependency, config, diagnostics);
                    pipeline.run(response);
                }
                aggregator.aggregate(dependency);
            });

            winston.info('on file ');

            sentiment_api_call('maven', dependency.name.value, dependency.version.value, (response) => {
                if (response != null) {
                    let pipeline = new DiagnosticsPipelineSenti(DiagnosticsEnginesSenti, dependency, config, diagnostics);
                    pipeline.run(response);
                }
                aggregator.aggregate(dependency);
            });
        }
    });
});

files.on(EventStream.Diagnostics, "^requirements\\.txt$", (uri, name, contents) => {
    let collector = new ReqDependencyCollector();

    collector.collect(contents).then((deps) => {
        let diagnostics = [];
        /* Aggregate asynchronous requests and send the diagnostics at once */
        let aggregator = new Aggregator(deps, () => {
            connection.sendDiagnostics({uri: uri, diagnostics: diagnostics});
        });
        for (let dependency of deps) {
            winston.info('python cmp name'+ dependency.name.value);
            get_metadata('pypi', dependency.name.value, dependency.version.value, (response) => {
                if (response != null) {
                    let pipeline = new DiagnosticsPipeline(DiagnosticsEngines, dependency, config, diagnostics);
                    pipeline.run(response);
                }
                aggregator.aggregate(dependency);
            });
        }
    });
});

let checkDelay;
connection.onDidSaveTextDocument((params) => {
    winston.debug('on save ');
    clearTimeout(checkDelay);
    server.handle_file_event(params.textDocument.uri, server.files.file_data[params.textDocument.uri]);
});

connection.onDidChangeTextDocument((params) => {
    winston.info('on change ');
    /* Update internal state for code lenses */
    server.files.file_data[params.textDocument.uri] = params.contentChanges[0].text;
    server.handle_file_event(params.textDocument.uri, server.files.file_data[params.textDocument.uri])
    clearTimeout(checkDelay);
    checkDelay = setTimeout(() => {
        server.handle_file_event(params.textDocument.uri, server.files.file_data[params.textDocument.uri])
    }, 500)
});

connection.onDidOpenTextDocument((params) => {
    winston.debug('on file open ');
    server.handle_file_event(params.textDocument.uri, params.textDocument.text);
});

connection.onCodeAction((params, token): Command[] => {
    clearTimeout(checkDelay);
    let commands: Command[] = [];
    for (let diagnostic of params.context.diagnostics) {
        let command = codeActionsMap[diagnostic.message];
        if (command != null) {
            commands.push(command)
        }
    }
    return commands
});

connection.onDidCloseTextDocument((params) => {
    clearTimeout(checkDelay);
});

connection.listen();
