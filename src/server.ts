/* --------------------------------------------------------------------------------------------
 * Copyright (c) Red Hat
 * Licensed under the Apache-2.0 License. See License.txt in the project root for license information.
 * ------------------------------------------------------------------------------------------ */
'use strict';

import * as path from 'path';

import {
    createConnection,
    TextDocuments, InitializeResult, CodeAction, CodeActionKind,
    ProposedFeatures
} from 'vscode-languageserver/node';

import { DependencyProvider as PackageJson } from './providers/package.json';
import { DependencyProvider as PomXml } from './providers/pom.xml';
import { DependencyProvider as GoMod } from './providers/go.mod';
import { DependencyProvider as RequirementsTxt } from './providers/requirements.txt';
import { DependencyMap, IDependencyProvider } from './collector';
import { SecurityEngine, DiagnosticsPipeline, codeActionsMap } from './consumers';
import { NoopVulnerabilityAggregator, MavenVulnerabilityAggregator } from './aggregators';
import { ANALYTICS_SOURCE } from './vulnerability';
import { config } from './config';
import { TextDocumentSyncKind, Connection, DidChangeConfigurationNotification } from 'vscode-languageserver';
import { TextDocument } from 'vscode-languageserver-textdocument';

import exhort from '@RHEcosystemAppEng/exhort-javascript-api';


enum EventStream {
    Invalid,
    Diagnostics
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
    const capabilities = params.capabilities;
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

// Defining settings for Red Hat Dependency Analytics
interface RedhatDependencyAnalyticsSettings {
    exhortSnykToken: string;
    matchManifestVersions: string;
    exhortMvnPath: string;
    exhortNpmPath: string;
    exhortGoPath: string;
    exhortPython3Path: string;
    exhortPip3Path: string;
    exhortPythonPath: string;
    exhortPipPath: string;
}

// Initializing default settings for Red Hat Dependency Analytics
const defaultSettings: RedhatDependencyAnalyticsSettings = {
    exhortSnykToken: config.exhortSnykToken,
    matchManifestVersions: config.matchManifestVersions,
    exhortMvnPath: config.exhortMvnPath,
    exhortNpmPath: config.exhortNpmPath,
    exhortGoPath: config.exhortGoPath,
    exhortPython3Path: config.exhortPython3Path,
    exhortPip3Path: config.exhortPip3Path,
    exhortPythonPath: config.exhortPythonPath,
    exhortPipPath: config.exhortPipPath
};

// Creating a mutable variable to hold the global settings for Red Hat Dependency Analytics.
let globalSettings: RedhatDependencyAnalyticsSettings = defaultSettings;

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
    fileData: Map<string, string>;
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
    fileData: Map<string, string>;
    constructor() {
        this.handlers = [];
        this.fileData = new Map<string, string>();
    }
    on(stream: EventStream, matcher: string, cb: IFileHandlerCallback): IAnalysisFiles {
        this.handlers.push(new AnalysisFileHandler(matcher, stream, cb));
        return this;
    }
    run(stream: EventStream, uri: string, file: string, contents: string): any {
        for (const handler of this.handlers) {
            if (handler.stream === stream && handler.matcher.test(file)) {
                return handler.callback(uri, file, contents);
            }
        }
    }
}

interface IAnalysisLSPServer {
    conn: Connection;
    files: IAnalysisFiles;

    handleFileEvent(uri: string, contents: string): void;
}

class AnalysisLSPServer implements IAnalysisLSPServer {
    constructor(public conn: Connection, public files: IAnalysisFiles) { }

    handleFileEvent(uri: string, contents: string): void {
        const pathName = new URL(uri).pathname;
        const fileName = path.basename(pathName);

        this.files.fileData[uri] = contents;

        this.files.run(EventStream.Diagnostics, uri, fileName, contents);
    }
}

const files: IAnalysisFiles = new AnalysisFiles();
const server: IAnalysisLSPServer = new AnalysisLSPServer(connection, files);

// total counts of known security vulnerabilities
class VulnCount {
    issuesCount: number = 0;
}
// Generate summary notification message for vulnerability analysis
const getCAmsg = (deps, diagnostics, vulnCount): string => {
    let msg = `Scanned ${deps.length} ${deps.length === 1 ? 'dependency' : 'dependencies'}, `;

    if (diagnostics.length > 0) {
        const c = vulnCount.issuesCount;
        const vulStr = (count: number) => count === 1 ? 'Vulnerability' : 'Vulnerabilities';
        msg = c > 0 ? `flagged ${c} Known Security ${vulStr(c)} along with quick fixes` : 'No potential security vulnerabilities found';
    } else {
        msg += 'No potential security vulnerabilities found';
    }

    return msg;
};

/* Runs DiagnosticPileline to consume dependencies and generate Diagnostic[] */
function runPipeline(dependencies, diagnostics, packageAggregator, diagnosticFilePath, pkgMap: DependencyMap, vulnCount, provider: IDependencyProvider) {
    dependencies.forEach(d => {
        // match dependency with dependency from package map
        const pkg = pkgMap.get(d.ref.split('@')[0].replace(`pkg:${provider.ecosystem}/`, ''));
        // if dependency mached, run diagnostic
        if (pkg !== undefined) {
            const pipeline = new DiagnosticsPipeline(SecurityEngine, pkg, config, diagnostics, packageAggregator, diagnosticFilePath);
            pipeline.run(d);
            const secEng = pipeline.item as SecurityEngine;
            vulnCount.issuesCount += secEng.issuesCount;
        }
    });
    connection.sendDiagnostics({ uri: diagnosticFilePath, diagnostics: diagnostics });
    connection.console.log(`sendDiagnostics: ${diagnostics?.length}`);
}

// Fetch Vulnerabilities by component analysis API call
const fetchVulnerabilities = async (fileType: string, reqData: string) => {
    
    // set up configuration options for the component analysis request
    const options = {
        'RHDA_TOKEN': config.telemetryId,
        'RHDA_SOURCE': config.utmSource,
        'EXHORT_DEV_MODE': config.exhortDevMode,
        'MATCH_MANIFEST_VERSIONS': globalSettings.matchManifestVersions,
        'EXHORT_MVN_PATH': globalSettings.exhortMvnPath,
        'EXHORT_NPM_PATH': globalSettings.exhortNpmPath,
        'EXHORT_GO_PATH': globalSettings.exhortGoPath,
        'EXHORT_PYTHON3_PATH': globalSettings.exhortPython3Path,
        'EXHORT_PIP3_PATH': globalSettings.exhortPip3Path,
        'EXHORT_PYTHON_PATH': globalSettings.exhortPythonPath,
        'EXHORT_PIP_PATH': globalSettings.exhortPipPath
    };
    if (globalSettings.exhortSnykToken !== '') {
        options['EXHORT_SNYK_TOKEN'] = globalSettings.exhortSnykToken;
    }

        // get component analysis in JSON format
    const componentAnalysisJson = await exhort.componentAnalysis(fileType, reqData, options);

    // check vulnerability provider statuses
    const ko = [];
    componentAnalysisJson.summary.providerStatuses.forEach(ps => {
        if (!ps.ok) {
            ko.push(ps.provider);
        }
    });
    // issue warning if failed to fetch data from providers
    if (ko.length !== 0) {
        const errMsg = `The Component Analysis couldn't fetch data from the following providers: [${ko}]`;
        connection.console.warn(errMsg);
        connection.sendNotification('caSimpleWarning', errMsg);
    }

    return componentAnalysisJson;
};

const sendDiagnostics = async (diagnosticFilePath: string, contents: string, provider: IDependencyProvider) => {

    // get dependencies from response before firing diagnostics.   
    const getDepsAndRunPipeline = response => {
        let deps = [];
        if (response.dependencies && response.dependencies.length > 0) {
            deps = response.dependencies;
        }
        runPipeline(deps, diagnostics, packageAggregator, diagnosticFilePath, pkgMap, vulnCount, provider);
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
        deps = await provider.collect(contents);
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
    const pkgMap = new DependencyMap(deps);

    // init aggregator
    const packageAggregator = provider.ecosystem === 'maven' ? new MavenVulnerabilityAggregator(provider) : new NoopVulnerabilityAggregator(provider);

    // init tracking components
    const diagnostics = [];
    const vulnCount = new VulnCount();
    const start = new Date().getTime();
        
    // fetch vulnerabilities
    const request = fetchVulnerabilities(path.basename(diagnosticFilePath), contents)
    .then(getDepsAndRunPipeline)
    .catch(error => {
        const errMsg = `Component Analysis error. ${error}`;
        connection.console.warn(errMsg);
        connection.sendNotification('caSimpleWarning', errMsg);
        return;
    });
    await request;

    // report results
    const end = new Date().getTime();
    connection.console.log(`fetch vulns took ${end - start} ms`);
    connection.sendNotification('caNotification', {
        data: getCAmsg(deps, diagnostics, vulnCount),
        done: true,
        uri: diagnosticFilePath,
        diagCount: diagnostics.length || 0,
        vulnCount: vulnCount.issuesCount,
    });
};

files.on(EventStream.Diagnostics, '^package\\.json$', (uri, name, contents) => {
    sendDiagnostics(uri, contents, new PackageJson());
});

files.on(EventStream.Diagnostics, '^pom\\.xml$', (uri, name, contents) => {
    sendDiagnostics(uri, contents, new PomXml());
});

files.on(EventStream.Diagnostics, '^go\\.mod$', (uri, name, contents) => {
    sendDiagnostics(uri, contents, new GoMod());
});

files.on(EventStream.Diagnostics, '^requirements\\.txt$', (uri, name, contents) => {
    sendDiagnostics(uri, contents, new RequirementsTxt());
});

// TRIGGERS
let checkDelay;

// triggered when document is opened
connection.onDidOpenTextDocument((params) => {
    server.handleFileEvent(params.textDocument.uri, params.textDocument.text);
});

// triggered when document is saved
connection.onDidSaveTextDocument((params) => {
    clearTimeout(checkDelay);
    server.handleFileEvent(params.textDocument.uri, server.files.fileData[params.textDocument.uri]);
});

// triggered when changes have been applied to document
connection.onDidChangeTextDocument((params) => {
    /* Update internal state for code lenses */
    server.files.fileData[params.textDocument.uri] = params.contentChanges[0].text;
    clearTimeout(checkDelay);
    checkDelay = setTimeout(() => {
        server.handleFileEvent(params.textDocument.uri, server.files.fileData[params.textDocument.uri]);
    }, 3000);
});

// triggered when document is closed
connection.onDidCloseTextDocument(() => {
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
        server.conn.workspace.getConfiguration().then((data) => {
            // Updating global settings based on the fetched configuration data.
            globalSettings = ({
                exhortSnykToken: data.redHatDependencyAnalytics.exhortSnykToken,
                matchManifestVersions: data.redHatDependencyAnalytics.matchManifestVersions ? 'true' : 'false',
                exhortMvnPath: data.mvn.executable.path || 'mvn',
                exhortNpmPath: data.npm.executable.path || 'npm',
                exhortGoPath: data.go.executable.path || 'go',
                exhortPython3Path: data.python3.executable.path || 'python3',
                exhortPip3Path: data.pip3.executable.path || 'pip3',
                exhortPythonPath: data.python.executable.path || 'python',
                exhortPipPath: data.pip.executable.path || 'pip'
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
    const codeActions: CodeAction[] = [];
    let hasAnalyticsDiagonostic: boolean = false;
    for (const diagnostic of params.context.diagnostics) {
        const codeAction = codeActionsMap[diagnostic.range.start.line + '|' + diagnostic.range.start.character];
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
            hasAnalyticsDiagonostic = diagnostic.source === ANALYTICS_SOURCE;
        }
    }
    if (config.provideFullstackAction && hasAnalyticsDiagonostic) {
        codeActions.push(fullStackReportAction());
    }
    return codeActions;
});

connection.listen();