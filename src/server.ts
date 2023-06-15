/* --------------------------------------------------------------------------------------------
 * Copyright (c) Pavel Odvody 2016
 * Licensed under the Apache-2.0 License. See License.txt in the project root for license information.
 * ------------------------------------------------------------------------------------------ */
'use strict';

import * as path from 'path';
import * as fs from 'fs';
import * as uuid from 'uuid';
import * as crypto from 'crypto';

import {
    createConnection,
    TextDocuments, InitializeResult,
    CodeLens, CodeAction, CodeActionKind,
    ProposedFeatures
} from 'vscode-languageserver/node';
import fetch from 'node-fetch';
import url from 'url';

import { DependencyCollector as GoMod } from './collector/go.mod';
import { DependencyCollector as PackageJson } from './collector/package.json';
import { DependencyCollector as PomXml } from './collector/pom.xml';
import { DependencyCollector as RequirementsTxt } from './collector/requirements.txt';
import { IDependencyCollector, SimpleDependency, DependencyMap } from './collector';
import { SecurityEngine, DiagnosticsPipeline, codeActionsMap } from './consumers';
import { NoopVulnerabilityAggregator, MavenVulnerabilityAggregator, GolangVulnerabilityAggregator } from './aggregators';
import { AnalyticsSource } from './vulnerability';
import { config } from './config';
import { globalCache as GlobalCache } from './cache';
import { TextDocumentSyncKind, Connection, DidChangeConfigurationNotification } from 'vscode-languageserver';
import {
    TextDocument
} from 'vscode-languageserver-textdocument';

import { execSync } from 'child_process';

enum EventStream {
    Invalid,
    Diagnostics,
    CodeLens
}

// Create a connection for the server, using Node's IPC as a transport.
// Also include all preview / proposed LSP features.
const connection: Connection = createConnection(ProposedFeatures.all);
const documents: TextDocuments<TextDocument> = new TextDocuments(TextDocument);
documents.listen(connection);

let triggerFullStackAnalysis: string;
let hasConfigurationCapability: boolean = false;

interface DependencyAnalyticsSettings {
    crdaHost: string;
    crdaSnykToken: string;
    mvnExecutable: string;
}

const defaultSettings: DependencyAnalyticsSettings = {
    crdaHost: config.crda_api_url,
    crdaSnykToken: config.crda_snyk_token,
    mvnExecutable: config.mvn_executable
};

let globalSettings: DependencyAnalyticsSettings = defaultSettings;

connection.onInitialize((params): InitializeResult => {
    let capabilities = params.capabilities;
    triggerFullStackAnalysis = params.initializationOptions.triggerFullStackAnalysis;
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
}

const maxCacheItems = 1000;
const maxCacheAge = 30 * 60 * 1000;
const globalCache = key => GlobalCache(key, maxCacheItems, maxCacheAge);

let files: IAnalysisFiles = new AnalysisFiles();
let server: IAnalysisLSPServer = new AnalysisLSPServer(connection, files);
let rc_file = path.join(config.home_dir, '.analysis_rc');
if (fs.existsSync(rc_file)) {
    let rc = JSON.parse(fs.readFileSync(rc_file, 'utf8'));
    if ('server' in rc) {
        config.server_url = `${rc.server}/api/v2`;
    }
}

const fullStackReportAction = (): CodeAction => ({
    title: 'Detailed Vulnerability Report',
    kind: CodeActionKind.QuickFix,
    command: {
        command: triggerFullStackAnalysis,
        title: 'Analytics Report',
    }
});

let DiagnosticsEngines = [SecurityEngine];

/* Generate summarized notification message for vulnerability analysis */
const getCAmsg = (deps, diagnostics, totalCount): string => {
    let msg = `Scanned ${deps.length} ${deps.length === 1 ? 'dependency' : 'dependencies'}, `;

    if (diagnostics.length > 0) {
        const vulStr = (count: number) => count === 1 ? 'Vulnerability' : 'Vulnerabilities';
        const advStr = (count: number) => count === 1 ? 'Advisory' : 'Advisories';
        const vulnCount = totalCount.vulnerabilityCount || totalCount.issuesCount || 0;
        const knownVulnMsg = !vulnCount || `${vulnCount} Known Security ${vulStr(vulnCount)}`;
        const advisoryMsg = !totalCount.advisoryCount || `${totalCount.advisoryCount} Security ${advStr(totalCount.advisoryCount)}`;
        let summaryMsg = [knownVulnMsg, advisoryMsg].filter(x => x !== true).join(' and ');
        summaryMsg += (totalCount.exploitCount > 0) ? ` with ${totalCount.exploitCount} Exploitable ${vulStr(totalCount.exploitCount)}` : '';
        summaryMsg += ((vulnCount + totalCount.advisoryCount) > 0) ? ' along with quick fixes' : '';
        msg += summaryMsg ? ('flagged ' + summaryMsg) : 'No potential security vulnerabilities found';
    } else {
        msg += `No potential security vulnerabilities found`;
    }

    return msg;
};

const caDefaultMsg = 'Checking for security vulnerabilities ...';

/* Fetch Vulnerabilities by component-analysis batch api-call */
const fetchVulnerabilities = async (reqData: any, manifestHash: string, requestId: string) => {
    let url = '';
    let headers = {};
    let body = '';
    if (reqData.ecosystem === 'maven') {
        url = `${globalSettings.crdaHost}/api/v3/component-analysis/${reqData.ecosystem}`;
        headers = {
            'Content-Type': 'application/json',
        };

        if (globalSettings.crdaSnykToken !== '') {
            headers = {
                ...headers,
                'Crda-Snyk-Token': globalSettings.crdaSnykToken
            };
        }
        body = JSON.stringify(reqData.package_versions);
    } else {
        url = config.server_url;
        if (config.three_scale_user_token) {
            url += `/component-analyses/?user_key=${config.three_scale_user_token}`;
        } else {
            url += `/component-analyses`;
        }
        headers = {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer ' + config.api_token,
            'X-Request-Id': requestId,
        };

        url += `&utm_content=${manifestHash}`;

        if (config.utm_source) {
            url += `&utm_source=${config.utm_source}`;
        }

        if (config.uuid) {
            headers['uuid'] = config.uuid;
        }

        if (config.telemetry_id) {
            headers['X-Telemetry-Id'] = config.telemetry_id;
        }
        body = JSON.stringify(reqData);
    }

    try {
        const response = await fetch(url, {
            method: 'post',
            body: body,
            headers: headers,
        });

        connection.console.log(`fetching vuln for ${reqData.package_versions.length} packages`);
        if (response.ok) {
            const respData = await response.json();
            if (reqData.ecosystem === 'maven') {
                let ko = new Array();
                respData.summary.providerStatuses.forEach(ps => {
                    if (!ps.ok) {
                        ko.push(ps.provider);
                    }
                });
                if (ko.length !== 0) {
                    const errMsg = `The component analysis couldn't fetch data from the following providers: [${ko}]`;
                    connection.console.warn(errMsg);
                    connection.sendNotification('caSimpleWarning', errMsg);
                }
            }
            return respData;
        } else {
            const errMsg = `fetch error. http status ${response.status}`;
            connection.console.warn(errMsg);
            connection.sendNotification('caSimpleWarning', errMsg);
            return response.status;
        }
    } catch (err) {
        connection.console.warn(`Exception while fetch: ${err}`);
    }
};

/* Total Counts of #Known Security Vulnerability and #Security Advisory */
class TotalCount {
    vulnerabilityCount: number = 0;
    advisoryCount: number = 0;
    exploitCount: number = 0;
    issuesCount: number = 0;
}

/* Runs DiagnosticPileline to consume dependencies and generate Diagnostic[] */
function runPipeline(dependencies, diagnostics, packageAggregator, diagnosticFilePath, pkgMap: DependencyMap, totalCount, ecosystem: string) {
    dependencies.forEach(d => {
        const pkg = (ecosystem === 'maven') ? pkgMap.get(new SimpleDependency(d.ref.name, d.ref.version)) : pkgMap.get(new SimpleDependency(d.package, d.version));
        if (pkg !== undefined) {
            let pipeline = new DiagnosticsPipeline(DiagnosticsEngines, pkg, config, diagnostics, packageAggregator, diagnosticFilePath);
            pipeline.run(d);
            for (const item of pipeline.items) {
                const secEng = item as SecurityEngine;
                totalCount.vulnerabilityCount += secEng.vulnerabilityCount;
                totalCount.advisoryCount += secEng.advisoryCount;
                totalCount.exploitCount += secEng.exploitCount;
                totalCount.issuesCount += secEng.issuesCount;
            }
        }
    });
    connection.sendDiagnostics({ uri: diagnosticFilePath, diagnostics: diagnostics });
    connection.console.log(`sendDiagnostics: ${diagnostics?.length}`);
}

/* Slice payload in each chunk size of @batchSize */
function slicePayload(payload, batchSize, ecosystem): any {
    let reqData = [];
    for (let i = 0; i < payload.length; i += batchSize) {
        reqData.push({
            'ecosystem': ecosystem,
            'package_versions': payload.slice(i, i + batchSize)
        });
    }
    return reqData;
}

const regexVersion = new RegExp(/^([a-zA-Z0-9]+\.)?([a-zA-Z0-9]+\.)?([a-zA-Z0-9]+\.)?([a-zA-Z0-9]+)$/);
const sendDiagnostics = async (ecosystem: string, diagnosticFilePath: string, contents: string, collector: IDependencyCollector) => {
    // clear all diagnostics
    connection.sendDiagnostics({ uri: diagnosticFilePath, diagnostics: [] });
    connection.sendNotification('caNotification', {
        data: caDefaultMsg,
        done: false,
        uri: diagnosticFilePath,
    });

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

    let validPackages = ecosystem === 'golang' ? deps : deps.filter(d => regexVersion.test(d.version.value.trim()));
    let packageAggregator = ecosystem === 'golang' ? new GolangVulnerabilityAggregator() : (ecosystem === 'maven' ? new MavenVulnerabilityAggregator() : new NoopVulnerabilityAggregator());
    const pkgMap = new DependencyMap(validPackages);
    const batchSize = 10;
    const diagnostics = [];
    const totalCount = new TotalCount();
    const start = new Date().getTime();
    const manifestHash = crypto.createHash('sha256').update(diagnosticFilePath).digest('hex');
    const requestId = uuid.v4();
    // Closure which captures common arg to runPipeline.
    const pipeline = dependencies => runPipeline(dependencies, diagnostics, packageAggregator, diagnosticFilePath, pkgMap, totalCount, ecosystem);
    // Get and fire diagnostics for items found in Cache.
    const cache = globalCache(ecosystem);
    const cachedItems = cache.get(validPackages);
    const cachedValues = Array.from(cachedItems.filter(c => c.V !== undefined).map(c => c.V));
    const missedItems = cachedItems.filter(c => c.V === undefined).map(c => c.K);
    connection.console.log(`cache hit: ${cachedValues.length} miss: ${missedItems.length}`);
    pipeline(cachedValues);

    // Construct request payload for items not in Cache.
    const requestPayload = missedItems.map(d => {
        if (ecosystem === 'maven') {
            return { name: d.name.value, version: d.version.value };
        } else {
            return { package: d.name.value, version: d.version.value };
        }
    });
    // check for dependencies
    const getDependencies = response => {
        if (response.dependencies && response.dependencies.length > 0) {
            return response.dependencies;
        } else {
            return [];
        }
    };
    // Closure which adds response into cache before firing diagnostics.   
    const cacheAndRunPipeline = response => {
        let dependencies = [];
        if (ecosystem === 'maven') {
            dependencies = getDependencies(response);
        } else {
            dependencies = Array.from(new Set(response.map(JSON.stringify))).map((item: string) => JSON.parse(item));
        }
        cache.add(dependencies);
        pipeline(dependencies);
    };
    const allRequests = slicePayload(requestPayload, batchSize, ecosystem).
        map(request => fetchVulnerabilities(request, manifestHash, requestId).then(cacheAndRunPipeline));

    await Promise.allSettled(allRequests);
    const end = new Date().getTime();

    connection.console.log(`fetch vulns took ${end - start} ms`);
    connection.sendNotification('caNotification', {
        data: getCAmsg(deps, diagnostics, totalCount),
        diagCount: diagnostics.length || 0,
        vulnCount: totalCount,
        depCount: deps.length || 0,
        done: true,
        uri: diagnosticFilePath,
        cacheHitCount: cachedValues.length,
        cacheMissCount: missedItems.length,
    });
};

function sendDiagnosticsWithEffectivePom(uri, original: string) {
    let tempTarget = uri.replace('file://', '').replaceAll('%20', ' ').replace('pom.xml', '');
    const effectivePomPath = path.join(tempTarget, 'target', 'effective-pom.xml');
    const tmpPomPath = path.join(tempTarget, 'target', 'in-memory-pom.xml');
    fs.writeFile(tmpPomPath, original, (error) => {
        if (error) {
            server.connection.sendNotification('caError', error);
        } else {
            try {
                execSync(`${globalSettings.mvnExecutable} help:effective-pom -Doutput='${effectivePomPath}' --quiet -f '${tmpPomPath}'`);
                try {
                    const data = fs.readFileSync(effectivePomPath, 'utf8');
                    sendDiagnostics('maven', uri, data, new PomXml(original));
                } catch (error) {
                    server.connection.sendNotification('caError', error.message);
                }
            } catch (error) {
                // Ignore. Non parseable pom and fall back to original content
                server.connection.sendNotification('caSimpleWarning', "Full component analysis cannot be performed until the Pom is valid.");
                connection.console.info("Unable to parse effective pom. Cause: " + error.message);
                sendDiagnostics('maven', uri, original, new PomXml(original));
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

files.on(EventStream.Diagnostics, '^requirements\\.txt$', (uri, name, contents) => {
    sendDiagnostics('pypi', uri, contents, new RequirementsTxt());
});

files.on(EventStream.Diagnostics, '^go\\.mod$', (uri, name, contents) => {
    connection.console.log('Using golang executable: ' + config.golang_executable);
    sendDiagnostics('golang', uri, contents, new GoMod(uri));
});

let checkDelay;

connection.onInitialized(() => {
    if (hasConfigurationCapability) {
        // Register for all configuration changes.
        connection.client.register(DidChangeConfigurationNotification.type, undefined);
    }
});

connection.onDidSaveTextDocument((params) => {
    clearTimeout(checkDelay);
    server.handle_file_event(params.textDocument.uri, server.files.file_data[params.textDocument.uri]);
});

connection.onDidChangeTextDocument((params) => {
    /* Update internal state for code lenses */
    server.files.file_data[params.textDocument.uri] = params.contentChanges[0].text;
    clearTimeout(checkDelay);
    checkDelay = setTimeout(() => {
        server.handle_file_event(params.textDocument.uri, server.files.file_data[params.textDocument.uri]);
    }, 500);
});

connection.onDidChangeConfiguration(() => {
    if (hasConfigurationCapability) {
        server.connection.workspace.getConfiguration().then((data) => {
            globalSettings = ({
                crdaHost: data.dependencyAnalytics.crdaHost,
                crdaSnykToken: data.dependencyAnalytics.crdaSnykToken,
                mvnExecutable: data.maven.executable.path || 'mvn'
            });
        });
    }
});

connection.onDidOpenTextDocument((params) => {
    server.handle_file_event(params.textDocument.uri, params.textDocument.text);
});

connection.onCodeAction((params): CodeAction[] => {
    let codeActions: CodeAction[] = [];
    let hasAnalyticsDiagonostic: boolean = false;
    for (let diagnostic of params.context.diagnostics) {
        let codeAction = codeActionsMap[diagnostic.range.start.line + '|' + diagnostic.range.start.character];
        if (codeAction !== null && codeAction !== undefined) {
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

connection.onDidCloseTextDocument((params) => {
    clearTimeout(checkDelay);
});

connection.listen();
