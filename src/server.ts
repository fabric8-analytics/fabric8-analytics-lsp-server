/* --------------------------------------------------------------------------------------------
 * Copyright (c) Red Hat
 * Licensed under the Apache-2.0 License. See License.txt in the project root for license information.
 * ------------------------------------------------------------------------------------------ */
'use strict';

import { TextDocumentSyncKind, Connection, DidChangeConfigurationNotification } from 'vscode-languageserver';
import { createConnection, TextDocuments, InitializeParams, InitializeResult, CodeAction, ProposedFeatures } from 'vscode-languageserver/node';
import { TextDocument } from 'vscode-languageserver-textdocument';

import { globalConfig } from './config';
import { AnalysisLSPServer } from './fileHandler';
import { getDiagnosticsCodeActions, clearCodeActionsMap } from './codeActionHandler';

/**
 * Create a connection for the server, using Node's IPC as a transport.
 */
const connection: Connection = createConnection(ProposedFeatures.all);

/**
 * Declares servers configuration capability
 */
let hasConfigurationCapability: boolean = false;

/**
 * Create a text document manager.
 */
const documents: TextDocuments<TextDocument> = new TextDocuments(TextDocument);
documents.listen(connection);

/**
 * Updates the configuration with the effective proxy URL and other settings.
 */
function updateConfiguration(rhdaConfig: any, mvn: any, httpConfig: any) {
    let effectiveProxyUrl = '';
    if (httpConfig && httpConfig.proxySupport !== 'off') {
        if (rhdaConfig.exhortProxyUrl && rhdaConfig.exhortProxyUrl.trim() !== '') {
            effectiveProxyUrl = rhdaConfig.exhortProxyUrl.trim();
        } else if (httpConfig.proxy) {
            effectiveProxyUrl = httpConfig.proxy.trim();
        } else {
            effectiveProxyUrl =
                process.env.HTTPS_PROXY ||
                process.env.https_proxy ||
                process.env.HTTP_PROXY ||
                process.env.http_proxy ||
                '';
            effectiveProxyUrl = effectiveProxyUrl.trim();
        }
    }
    const updatedConfig = {
        ...rhdaConfig,
        exhortProxyUrl: effectiveProxyUrl,
        fallbacks: {
            useMavenWrapper: mvn?.preferMavenWrapper ?? true
        }
    };

    // Update the global config with the new values
    globalConfig.updateConfig(updatedConfig);
}

/**
 * Sets up the connection's initialization event handler.
 */
connection.onInitialize((params: InitializeParams): InitializeResult => {
    const capabilities = params.capabilities;
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

/**
 * Registers a callback when the connection is fully initialized.
 */
connection.onInitialized(() => {
    if (hasConfigurationCapability) {
        connection.client.register(DidChangeConfigurationNotification.type, undefined);
        connection.workspace.getConfiguration([
            { section: 'redHatDependencyAnalytics' },
            { section: 'maven.executable' },
            { section: 'http' }
        ]).then(([rhdaConfig, mvn, httpConfig]) => {
            updateConfiguration(rhdaConfig, mvn, httpConfig);
        });
    }
});

/**
 * Represents the server handling the Language Server Protocol requests and notifications.
 */
const server = new AnalysisLSPServer(connection);

/**
 * On open document trigger event handler
 */
connection.onDidOpenTextDocument((params) => {
    server.handleFileEvent(params.textDocument.uri, params.textDocument.text);
});

/**
 * On changes applied, apply to server file data
 */
connection.onDidChangeTextDocument((params) => {
    server.files.fileData[params.textDocument.uri] = params.contentChanges[0].text;
});

/**
 * On save document trigger event handler
 */
connection.onDidSaveTextDocument((params) => {
    server.handleFileEvent(params.textDocument.uri, server.files.fileData[params.textDocument.uri]);
});

/**
 * On close document clear URI from codeActions Map
 */
connection.onDidCloseTextDocument((params) => {
    clearCodeActionsMap(params.textDocument.uri);
});

/**
 * Registers a callback when the configuration changes.
 */
connection.onDidChangeConfiguration(() => {
    if (hasConfigurationCapability) {
        server.conn.workspace.getConfiguration([
            { section: 'redHatDependencyAnalytics' },
            { section: 'maven.executable' },
            { section: 'http' }
        ]).then(([rhdaConfig, mvn, httpConfig]) => {
            updateConfiguration(rhdaConfig, mvn, httpConfig);
        });
    }
});

/**
 * Handles code action requests from client.
 */
connection.onCodeAction((params): CodeAction[] => {
    return getDiagnosticsCodeActions(params.context.diagnostics, params.textDocument.uri);
});

/**
 * Registers a callback for the 'snykTokenModified' notification.
 * 
 * @param notification The name of the notification.
 * @param callback The callback function to be invoked when the notification is received.
 * @param token The token received in the notification.
 */
connection.onNotification('snykTokenModified', token => {
    globalConfig.setExhortSnykToken(token);
});

connection.listen();

export { connection };
