/* --------------------------------------------------------------------------------------------
 * Copyright (c) Pavel Odvody 2016
 * Licensed under the Apache-2.0 License. See License.txt in the project root for license information.
 * ------------------------------------------------------------------------------------------ */
'use strict';
import * as path from 'path';
import * as fs from 'fs';
import {
	IPCMessageReader, IPCMessageWriter, createConnection, IConnection,
	TextDocuments, InitializeResult, CodeLens, CodeAction, CodeActionKind} from 'vscode-languageserver';
import { IDependencyCollector, PackageJsonCollector, ReqDependencyCollector, GomodDependencyCollector } from './collector';
import { PomXmlDependencyCollector } from './maven.collector';
import { SecurityEngine, DiagnosticsPipeline, codeActionsMap } from './consumers';
import { NoopVulnerabilityAggregator, GolangVulnerabilityAggregator } from './aggregators';
import { AnalyticsSource } from './vulnerability';
import { config } from './config';
import fetch from 'node-fetch';

const url = require('url');
const winston = require('winston');

let transport;
try {
  transport = new winston.transports.File({ filename: '/workspace-logs/ls-bayesian/bayesian.log' });
} catch(err) {
  transport = new winston.transports.Console({ silent: true });
}
const logger = winston.createLogger({
  level: 'debug',
  format: winston.format.simple(),
  transports: [ transport ]
});
logger.info('Starting Bayesian');

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

let files: IAnalysisFiles = new AnalysisFiles();
let server: IAnalysisLSPServer = new AnalysisLSPServer(connection, files);
let rc_file = path.join(config.home_dir, '.analysis_rc');
if (fs.existsSync(rc_file)) {
    let rc = JSON.parse(fs.readFileSync(rc_file, 'utf8'));
    if ('server' in rc) {
        config.server_url = `${rc.server}/api/v2`;
    }
}
const fullStackReportAction: CodeAction = {
  title: "Detailed Vulnerability Report",
  kind: CodeActionKind.QuickFix,
  command: {
    command: "extension.fabric8AnalyticsWidgetFullStack",
    title: "Analytics Report",
  }
};

let DiagnosticsEngines = [SecurityEngine];

/* Generate summarized notification message for vulnerability analysis */
const getCAmsg = (deps, diagnostics, totalCount): string => {
    let msg = `Scanned ${deps.length} ${deps.length == 1 ? 'dependency' : 'dependencies'}, `;

    
    if(diagnostics.length > 0) {
        const vulStr = (count: number) => count == 1 ? 'Vulnerability' : 'Vulnerabilities';
        const advStr = (count: number) => count == 1 ? 'Advisory' : 'Advisories';
        const knownVulnMsg =  !totalCount.vulnerabilityCount || `${totalCount.vulnerabilityCount} Known Security ${vulStr(totalCount.vulnerabilityCount)}`;
        const advisoryMsg =  !totalCount.advisoryCount || `${totalCount.advisoryCount} Security ${advStr(totalCount.advisoryCount)}`;
        let summaryMsg = [knownVulnMsg, advisoryMsg].filter(x => x !== true).join(' and ');
        summaryMsg += (totalCount.exploitCount > 0) ? ` with ${totalCount.exploitCount} Exploitable ${vulStr(totalCount.exploitCount)}` : "";
        summaryMsg += ((totalCount.vulnerabilityCount + totalCount.advisoryCount) > 0) ? " along with quick fixes" : "";
        msg += summaryMsg ? ('flagged ' + summaryMsg) : 'No potential security vulnerabilities found';
    } else {
        msg += `No potential security vulnerabilities found`;
    }

    return msg
};

const caDefaultMsg = 'Checking for security vulnerabilities ...';

/* Fetch Vulnerabilities by component-analysis batch api-call */
const fetchVulnerabilities = async (reqData) => {
    let url = config.server_url;
    if (config.three_scale_user_token) {
        url += `/component-analyses/?user_key=${config.three_scale_user_token}`;
    } else {
        url += `/component-analyses`;
    }
    const headers = {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + config.api_token,
    };
    if (config.uuid) {
        headers['uuid'] = config.uuid;
    }
    try {
        const response = await fetch(url , {
            method: 'post',
            body:    JSON.stringify(reqData),
            headers: headers,
        });

        connection.console.log(`fetching vuln for ${reqData.package_versions.length} packages`);
        if (response.ok) {
            const respData = await response.json();
            return respData;
        } else {
            connection.console.warn(`fetch error. http status ${response.status}`);
            return response.status;
        }
    } catch(err) {
        connection.console.warn(`Exception while fetch: ${err}`);
    }
};

/* Total Counts of #Known Security Vulnerability and #Security Advisory */
class TotalCount {
    vulnerabilityCount: number = 0;
    advisoryCount: number = 0;
    exploitCount: number = 0;
};

/* Runs DiagnosticPileline to consume response and generate Diagnostic[] */
function runPipeline(response, diagnostics, packageAggregator, diagnosticFilePath, dependencyMap, totalCount) {
    response.forEach(r => {
        const dependency = dependencyMap.get(r.package + r.version);
        let pipeline = new DiagnosticsPipeline(DiagnosticsEngines, dependency, config, diagnostics, packageAggregator, diagnosticFilePath);
        pipeline.run(r);
        for (const item of pipeline.items) {
            const secEng = item as SecurityEngine;
            totalCount.vulnerabilityCount += secEng.vulnerabilityCount;
            totalCount.advisoryCount += secEng.advisoryCount;
            totalCount.exploitCount += secEng.exploitCount;
        }
        connection.sendDiagnostics({ uri: diagnosticFilePath, diagnostics: diagnostics });
    })
}

/* Slice payload in each chunk size of @batchSize */
function slicePayload(payload, batchSize, ecosystem): any {
    let reqData = [];
    for (let i = 0; i < payload.length; i += batchSize) {
        reqData.push({
            "ecosystem": ecosystem,
            "package_versions": payload.slice(i, i + batchSize)
        });
    }
    return reqData;
}

const regexVersion =  new RegExp(/^([a-zA-Z0-9]+\.)?([a-zA-Z0-9]+\.)?([a-zA-Z0-9]+\.)?([a-zA-Z0-9]+)$/);
const sendDiagnostics = async (ecosystem: string, diagnosticFilePath: string, contents: string, collector: IDependencyCollector) => {
    connection.sendNotification('caNotification', {data: caDefaultMsg, done: false});
    let deps = null;
    try {
        const start = new Date().getTime();
        deps = await collector.collect(contents);
        const end = new Date().getTime();
        connection.console.log(`manifest parse took ${end - start} ms`);
    } catch (error) {
        // Error can be raised during golang `go list ` command only.
        if (ecosystem == "golang") {
            connection.console.warn(`Command execution failed with error: ${error}`);
            connection.sendNotification('caError', {'data': error});
            connection.sendDiagnostics({ uri: diagnosticFilePath, diagnostics: [] });
            return;
        }
    }

    let validPackages = deps;
    let packageAggregator = null;
    if (ecosystem != "golang") {
        validPackages = deps.filter(d => regexVersion.test(d.version.value.trim()));
        packageAggregator = new NoopVulnerabilityAggregator();
    } else {
        packageAggregator = new GolangVulnerabilityAggregator();
    }
    const requestPayload = validPackages.map(d => ({"package": d.name.value, "version": d.version.value}));
    const requestMapper = new Map(validPackages.map(d => [d.name.value + d.version.value, d]));
    const batchSize = 10;
    let diagnostics = [];
    let totalCount = new TotalCount();
    const start = new Date().getTime();
    const allRequests = slicePayload(requestPayload, batchSize, ecosystem).map(request =>
        fetchVulnerabilities(request).then(response =>
            runPipeline(response, diagnostics, packageAggregator, diagnosticFilePath, requestMapper, totalCount)));

    await Promise.allSettled(allRequests);
    const end = new Date().getTime();

    connection.console.log(`fetch vulns took ${end - start} ms`);
    connection.sendNotification('caNotification', {data: getCAmsg(deps, diagnostics, totalCount), diagCount : diagnostics.length || 0, vulnCount: totalCount, depCount: deps.length || 0, done: true});
};

files.on(EventStream.Diagnostics, "^package\\.json$", (uri, name, contents) => {
    sendDiagnostics('npm', uri, contents, new PackageJsonCollector());
});

files.on(EventStream.Diagnostics, "^pom\\.xml$", (uri, name, contents) => {
    sendDiagnostics('maven', uri, contents, new PomXmlDependencyCollector());
});

files.on(EventStream.Diagnostics, "^requirements\\.txt$", (uri, name, contents) => {
    sendDiagnostics('pypi', uri, contents, new ReqDependencyCollector());
});

files.on(EventStream.Diagnostics, "^go\\.mod$", (uri, name, contents) => {
    connection.console.log("Using golang executable: " + config.golang_executable);
    sendDiagnostics('golang', uri, contents, new GomodDependencyCollector(uri));
});

let checkDelay;
connection.onDidSaveTextDocument((params) => {
    clearTimeout(checkDelay);
    server.handle_file_event(params.textDocument.uri, server.files.file_data[params.textDocument.uri]);
});

connection.onDidChangeTextDocument((params) => {
    /* Update internal state for code lenses */
    server.files.file_data[params.textDocument.uri] = params.contentChanges[0].text;
    clearTimeout(checkDelay);
    checkDelay = setTimeout(() => {
        server.handle_file_event(params.textDocument.uri, server.files.file_data[params.textDocument.uri])
    }, 500)
});

connection.onDidOpenTextDocument((params) => {
    server.handle_file_event(params.textDocument.uri, params.textDocument.text);
});

connection.onCodeAction((params, token): CodeAction[] => {
    let codeActions: CodeAction[] = [];
    let hasAnalyticsDiagonostic: boolean = false;
    for (let diagnostic of params.context.diagnostics) {
        let codeAction = codeActionsMap[diagnostic.range.start.line + "|" + diagnostic.range.start.character];
        if (codeAction != null) {
            codeActions.push(codeAction);
   
        }
        if (!hasAnalyticsDiagonostic) {
            hasAnalyticsDiagonostic = diagnostic.source === AnalyticsSource;
        }
    }
    if (config.provide_fullstack_action && hasAnalyticsDiagonostic) {
        codeActions.push(fullStackReportAction);
    }
    return codeActions;
});

connection.onDidCloseTextDocument((params) => {
    clearTimeout(checkDelay);
});

connection.listen();
