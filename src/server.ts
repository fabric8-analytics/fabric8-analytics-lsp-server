/* --------------------------------------------------------------------------------------------
 * Copyright (c) Pavel Odvody 2016
 * Licensed under the Apache-2.0 License. See License.txt in the project root for license information.
 * ------------------------------------------------------------------------------------------ */
'use strict';

import * as path from 'path';
import * as fs from 'fs';

import {
    createConnection,
    TextDocuments, InitializeResult,
    CodeLens, CodeAction, CodeActionKind,
    ProposedFeatures
} from 'vscode-languageserver/node';

import { DependencyCollector as PackageJson } from './collector/package.json';
import { DependencyCollector as PomXml } from './collector/pom.xml';
import { IDependencyCollector, DependencyMap } from './collector';
import { SecurityEngine, DiagnosticsPipeline, codeActionsMap } from './consumers';
import { NoopVulnerabilityAggregator, MavenVulnerabilityAggregator } from './aggregators';
import { AnalyticsSource } from './vulnerability';
import { config } from './config';
import { TextDocumentSyncKind, Connection, DidChangeConfigurationNotification } from 'vscode-languageserver';
import {
    TextDocument
} from 'vscode-languageserver-textdocument';

import { execSync } from 'child_process';
import exhort from '@RHEcosystemAppEng/exhort-javascript-api';


enum EventStream {
    Invalid,
    Diagnostics,
    CodeLens
}

// Create a connection for the server, using Node's IPC as a transport.
// Include all preview / proposed LSP features.
const connection: Connection = createConnection(ProposedFeatures.all);
const documents: TextDocuments<TextDocument> = new TextDocuments(TextDocument);
documents.listen(connection);

// Set up the connection's initialization event handler.
let triggerFullStackAnalysis: string;
let triggerRHRepositoryRecommendationNotification: string;
let hasConfigurationCapability: boolean = false;
connection.onInitialize((params): InitializeResult => {
    let capabilities = params.capabilities;
    triggerFullStackAnalysis = params.initializationOptions.triggerFullStackAnalysis;
    triggerRHRepositoryRecommendationNotification = params.initializationOptions.triggerRHRepositoryRecommendationNotification;
    hasConfigurationCapability = !!(
        capabilities.workspace && !!capabilities.workspace.configuration
    );
    return {
        capabilities: {
            textDocumentSync: TextDocumentSyncKind.Full,
            codeActionProvider: true
        }
    };
});

// Defining settings for Dependency Analytics
interface DependencyAnalyticsSettings {
    exhortSnykToken: string;
    mvnExecutable: string;
}

// Initializing default settings for Dependency Analytics
const defaultSettings: DependencyAnalyticsSettings = {
    exhortSnykToken: config.exhort_snyk_token,
    mvnExecutable: config.mvn_executable
};

// Creating a mutable variable to hold the global settings for Dependency Analytics.
let globalSettings: DependencyAnalyticsSettings = defaultSettings;

interface IFileHandlerCallback {
    (uri: string, name: string, contents: string): void;
}

interface IAnalysisFileHandler {
    matcher: RegExp;
    stream: EventStream;
    callback: IFileHandlerCallback;
}

interface IAnalysisFiles {
    handlers: Array<IAnalysisFileHandler>;
    file_data: Map<string, string>;
    on(stream: EventStream, matcher: string, cb: IFileHandlerCallback): IAnalysisFiles;
    run(stream: EventStream, uri: string, file: string, contents: string): any;
}

class AnalysisFileHandler implements IAnalysisFileHandler {
    matcher: RegExp;
    constructor(matcher: string, public stream: EventStream, public callback: IFileHandlerCallback) {
        this.matcher = new RegExp(matcher);
    }
}

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
            if (handler.stream === stream && handler.matcher.test(file)) {
                return handler.callback(uri, file, contents);
            }
        }
    }
}

interface IAnalysisLSPServer {
    connection: Connection;
    files: IAnalysisFiles;

    handle_file_event(uri: string, contents: string): void;
    handle_code_lens_event(uri: string): CodeLens[];
}

class AnalysisLSPServer implements IAnalysisLSPServer {
    constructor(public connection: Connection, public files: IAnalysisFiles) { }

    handle_file_event(uri: string, contents: string): void {
        let path_name = new URL(uri).pathname;
        let file_name = path.basename(path_name);

        this.files.file_data[uri] = contents;

        this.files.run(EventStream.Diagnostics, uri, file_name, contents);
    }

    handle_code_lens_event(uri: string): CodeLens[] {
        let path_name = new URL(uri).pathname;
        let file_name = path.basename(path_name);
        let contents = this.files.file_data[uri];
        return this.files.run(EventStream.CodeLens, uri, file_name, contents);
    }
}

let files: IAnalysisFiles = new AnalysisFiles();
let server: IAnalysisLSPServer = new AnalysisLSPServer(connection, files);

// total counts of known security vulnerabilities
class TotalCount {
    issuesCount: number = 0;
}
// Generate summary notification message for vulnerability analysis
const getCAmsg = (deps, diagnostics, totalCount): string => {
    let msg = `Scanned ${deps.length} ${deps.length === 1 ? 'dependency' : 'dependencies'}, `;

    if (diagnostics.length > 0) {
        const vulnCount = totalCount.issuesCount;
        const vulStr = (count: number) => count === 1 ? 'Vulnerability' : 'Vulnerabilities';
        msg = vulnCount > 0 ? `flagged ${vulnCount} Known Security ${vulStr(vulnCount)} along with quick fixes` : 'No potential security vulnerabilities found';
    } else {
        msg += `No potential security vulnerabilities found`;
    }

    return msg;
};

/* Runs DiagnosticPileline to consume dependencies and generate Diagnostic[] */
function runPipeline(dependencies, ecosystem, diagnostics, packageAggregator, diagnosticFilePath, pkgMap: DependencyMap, totalCount) {
    dependencies.forEach(d => {
        // match dependency with dependency from package map
        const pkg = pkgMap.get(d.ref.split('@')[0].replace(`pkg:${ecosystem}/`, '').replace('/', ':'));
        // if dependency mached, run diagnostic
        if (pkg !== undefined) {
            let pipeline = new DiagnosticsPipeline(SecurityEngine, pkg, config, diagnostics, packageAggregator, diagnosticFilePath);
            pipeline.run(d);
            const secEng = pipeline.item as SecurityEngine;
            totalCount.issuesCount += secEng.issuesCount;
        }
    });
    connection.sendDiagnostics({ uri: diagnosticFilePath, diagnostics: diagnostics });
    connection.console.log(`sendDiagnostics: ${diagnostics?.length}`);
}

// Fetch Vulnerabilities by component analysis API call
const fetchVulnerabilities = async (fileType: string, reqData: any) => {
    
    // set up configuration options for the component analysis request
    const options = {};
    if (globalSettings.exhortSnykToken !== '') {
        options['EXHORT_SNYK_TOKEN'] = globalSettings.exhortSnykToken;
    }

    try {

        // get component analysis in JSON format
        let componentAnalysisJson = await exhort.componentAnalysis(fileType, reqData, options);

        // check vulnerability provider statuses
        let ko = new Array();
        componentAnalysisJson.summary.providerStatuses.forEach(ps => {
            if (!ps.ok) {
                ko.push(ps.provider);
            }
        });
        // issue warning if failed to fetch data from providers
        if (ko.length !== 0) {
            const errMsg = `The component analysis couldn't fetch data from the following providers: [${ko}]`;
            connection.console.warn(errMsg);
            connection.sendNotification('caSimpleWarning', errMsg);
        }

        return componentAnalysisJson;
    } catch (error) {
        const errMsg = `fetch error. ${error}`;
        connection.console.warn(errMsg);
        connection.sendNotification('caSimpleWarning', errMsg);
        return error;
    }
};

const sendDiagnostics = async (ecosystem: string, diagnosticFilePath: string, contents: string, collector: IDependencyCollector) => {

    // get dependencies from response before firing diagnostics.   
    const getDepsAndRunPipeline = response => {
        let deps = [];
        if (response.dependencies && response.dependencies.length > 0) {
            deps = response.dependencies;
        }
        runPipeline(deps, ecosystem, diagnostics, packageAggregator, diagnosticFilePath, pkgMap, totalCount);
    };

    // clear all diagnostics
    connection.sendDiagnostics({ uri: diagnosticFilePath, diagnostics: [] });
    connection.sendNotification('caNotification', {
        data: 'Checking for security vulnerabilities ...',
        done: false,
        uri: diagnosticFilePath,
    });

    // collect dependencies from manifest
    let deps = null;
    try {
        const start = new Date().getTime();
        deps = await collector.collect(contents);
        const end = new Date().getTime();
        connection.console.log(`manifest parse took ${end - start} ms, found ${deps.length} deps`);
    } catch (error) {
        connection.console.warn(`Error: ${error}`);
        connection.sendNotification('caError', {
            data: error,
            uri: diagnosticFilePath,
        });
        return;
    }

    // map dependencies
    const regexVersion = new RegExp(/^(~|\^)?([a-zA-Z0-9]+\.)?([a-zA-Z0-9]+\.)?([a-zA-Z0-9]+\.)?([a-zA-Z0-9]+)$/);
    const validPackages = deps.filter(d => regexVersion.test(d.version.value.trim()));
    const pkgMap = new DependencyMap(validPackages);

    // init aggregator
    let packageAggregator = ecosystem === 'maven' ? new MavenVulnerabilityAggregator() : new NoopVulnerabilityAggregator();

    // init tracking components
    const diagnostics = [];
    const totalCount = new TotalCount();
    const start = new Date().getTime();
        
    // fetch vulnerabilities
    const request = fetchVulnerabilities(path.basename(diagnosticFilePath), contents).then(getDepsAndRunPipeline);
    await request;

    // report results
    const end = new Date().getTime();
    connection.console.log(`fetch vulns took ${end - start} ms`);
    connection.sendNotification('caNotification', {
        data: getCAmsg(deps, diagnostics, totalCount),
        diagCount: diagnostics.length || 0,
        vulnCount: totalCount,
        depCount: deps.length || 0,
        done: true,
        uri: diagnosticFilePath,
    });
};

function sendDiagnosticsWithEffectivePom(uri, original: string) {
    let tempTarget = uri.replace('file://', '').replaceAll('%20', ' ').replace('pom.xml', '');
    const effectivePomPath = path.join(tempTarget, 'target', 'effective-pom.xml');
    const tmpPomPath = path.join(tempTarget, 'target', 'in-memory-pom.xml');
    if (!fs.existsSync(path.dirname(tmpPomPath))) {
        fs.mkdirSync(path.dirname(tmpPomPath), { recursive: true});
    }
    fs.writeFile(tmpPomPath, original, (error) => {
        if (error) {
            server.connection.sendNotification('caError', error);
        } else {
            try {
                execSync(`${globalSettings.mvnExecutable} help:effective-pom -Doutput='${effectivePomPath}' --quiet -f '${tmpPomPath}'`);
                try {
                    const data = fs.readFileSync(effectivePomPath, 'utf8');
                    sendDiagnostics('maven', uri, data, new PomXml(original, false));
                } catch (error) {
                    server.connection.sendNotification('caError', error.message);
                }
            } catch (error) {
                // Ignore. Non parseable pom and fall back to original content
                server.connection.sendNotification('caSimpleWarning', 'Full component analysis cannot be performed until the Pom is valid.');
                connection.console.info('Unable to parse effective pom. Cause: ' + error.message);
                sendDiagnostics('maven', uri, original, new PomXml(original, true));
            } finally {
                if (fs.existsSync(tmpPomPath)) {
                    fs.rmSync(tmpPomPath);
                }
                if (fs.existsSync(effectivePomPath)) {
                    fs.rmSync(effectivePomPath);
                }
            }
        }
    });
}

files.on(EventStream.Diagnostics, '^package\\.json$', (uri, name, contents) => {
    sendDiagnostics('npm', uri, contents, new PackageJson());
});

files.on(EventStream.Diagnostics, '^pom\\.xml$', (uri, name, contents) => {
    sendDiagnosticsWithEffectivePom(uri, contents);
});


// TRIGGERS
let checkDelay;

// triggered when document is opened
connection.onDidOpenTextDocument((params) => {
    server.handle_file_event(params.textDocument.uri, params.textDocument.text);
});

// triggered when document is saved
connection.onDidSaveTextDocument((params) => {
    clearTimeout(checkDelay);
    server.handle_file_event(params.textDocument.uri, server.files.file_data[params.textDocument.uri]);
});

// triggered when changes have been applied to document
connection.onDidChangeTextDocument((params) => {
    /* Update internal state for code lenses */
    server.files.file_data[params.textDocument.uri] = params.contentChanges[0].text;
    clearTimeout(checkDelay);
    checkDelay = setTimeout(() => {
        server.handle_file_event(params.textDocument.uri, server.files.file_data[params.textDocument.uri]);
    }, 500);
});

// triggered when document is closed
connection.onDidCloseTextDocument((params) => {
    clearTimeout(checkDelay);
});

// Registering a callback when the connection is fully initialized.
connection.onInitialized(() => {
    if (hasConfigurationCapability) {
        // Register for all configuration changes.
        connection.client.register(DidChangeConfigurationNotification.type, undefined);
    }
});

// Registering a callback when the configuration changes.
connection.onDidChangeConfiguration(() => {
    if (hasConfigurationCapability) {
        // Fetching the workspace configuration from the client.
        server.connection.workspace.getConfiguration().then((data) => {
            // Updating global settings based on the fetched configuration data.
            globalSettings = ({
                exhortSnykToken: data.dependencyAnalytics.exhortSnykToken,
                mvnExecutable: data.maven.executable.path || 'mvn'
            });
        });
    }
});

const fullStackReportAction = (): CodeAction => ({
    title: 'Detailed Vulnerability Report',
    kind: CodeActionKind.QuickFix,
    command: {
        command: triggerFullStackAnalysis,
        title: 'Analytics Report',
    }
});


connection.onCodeAction((params): CodeAction[] => {
    let codeActions: CodeAction[] = [];
    let hasAnalyticsDiagonostic: boolean = false;
    for (let diagnostic of params.context.diagnostics) {
        let codeAction = codeActionsMap[diagnostic.range.start.line + '|' + diagnostic.range.start.character];
        if (codeAction) {
            
            if (path.basename(params.textDocument.uri) === 'pom.xml') {
                codeAction.command = {
                title: 'RedHat repository recommendation',
                command: triggerRHRepositoryRecommendationNotification,
                };   
            }

            codeActions.push(codeAction);

        }
        if (!hasAnalyticsDiagonostic) {
            hasAnalyticsDiagonostic = diagnostic.source === AnalyticsSource;
        }
    }
    if (config.provide_fullstack_action && hasAnalyticsDiagonostic) {
        codeActions.push(fullStackReportAction());
    }
    return codeActions;
});

connection.listen();