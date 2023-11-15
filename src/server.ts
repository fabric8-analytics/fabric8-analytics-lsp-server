/* --------------------------------------------------------------------------------------------
 * Copyright (c) Red Hat
 * Licensed under the Apache-2.0 License. See License.txt in the project root for license information.
 * ------------------------------------------------------------------------------------------ */
'use strict';

import * as path from 'path';
import { TextDocumentSyncKind, Connection, DidChangeConfigurationNotification } from 'vscode-languageserver';
import { createConnection, TextDocuments, InitializeResult, CodeAction, ProposedFeatures } from 'vscode-languageserver/node';
import { TextDocument } from 'vscode-languageserver-textdocument';

import { globalConfig } from './config';
import { AnalysisLSPServer } from './fileHandler';
import { getDiagnosticsCodeActions } from './codeActionHandler';

/**
 * Declares timeout identifier to track delays for server.handleFileEvent execution
 */
let checkDelay: NodeJS.Timeout;

/**
 * Represents the connection used for the server, using Node's IPC as a transport.
 */
const connection: Connection = createConnection(ProposedFeatures.all);

/**
 * Represents the documents managed by the server.
 */
const documents: TextDocuments<TextDocument> = new TextDocuments(TextDocument);
documents.listen(connection);

/**
 * Sets up the connection's initialization event handler.
 */
let hasConfigurationCapability: boolean = false;
connection.onInitialize((params): InitializeResult => {
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
connection.onDidCloseTextDocument(() => {
    clearTimeout(checkDelay);
});

/**
 * Registers a callback when the configuration changes.
 */
connection.onDidChangeConfiguration(() => {
    if (hasConfigurationCapability) {
        server.conn.workspace.getConfiguration()
        .then((data) => {
            globalConfig.updateConfig(data);
        });
    }
});

/**
 * Handles code action requests from client.
 */
connection.onCodeAction((params): CodeAction[] => {
    return getDiagnosticsCodeActions(params.context.diagnostics, path.basename(params.textDocument.uri));
});

connection.listen();

export { connection };
