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
 * Declares timeout identifier to track delays for server.handleFileEvent execution
 */
let checkDelay: NodeJS.Timeout;

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
    }
});

/**
 * Represents the server handling the Language Server Protocol requests and notifications.
 */
const server = new AnalysisLSPServer(connection);

/**
 * On open document event handler
 */
connection.onDidOpenTextDocument((params) => {
    server.handleFileEvent(params.textDocument.uri, params.textDocument.text);
});

/**
 * On save document event handler
 */
connection.onDidSaveTextDocument((params) => {
    clearTimeout(checkDelay);
    server.handleFileEvent(params.textDocument.uri, server.files.fileData[params.textDocument.uri]);
});

/**
 * On changes applied to document event handler
 */
connection.onDidChangeTextDocument((params) => {
    server.files.fileData[params.textDocument.uri] = params.contentChanges[0].text;
    clearTimeout(checkDelay);
    checkDelay = setTimeout(() => {
        server.handleFileEvent(params.textDocument.uri, server.files.fileData[params.textDocument.uri]);
    }, 3000);
});

/**
 * On close document event handler
 */
connection.onDidCloseTextDocument((params) => {
    clearTimeout(checkDelay);
    clearCodeActionsMap(params.textDocument.uri);
});

/**
 * Registers a callback when the configuration changes.
 */
connection.onDidChangeConfiguration(() => {
    if (hasConfigurationCapability) {
        server.conn.workspace.getConfiguration('redHatDependencyAnalytics')
        .then((rhdaData) => {
            globalConfig.updateConfig(rhdaData);
        });
    }
});

/**
 * Handles code action requests from client.
 */
connection.onCodeAction((params): CodeAction[] => {
    return getDiagnosticsCodeActions(params.context.diagnostics, params.textDocument.uri);
});

connection.listen();

export { connection };
