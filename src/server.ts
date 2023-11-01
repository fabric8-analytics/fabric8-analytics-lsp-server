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

// declare timeout identifier to track delays for server.handleFileEvent execution
let checkDelay: NodeJS.Timeout;

// Create a connection for the server, using Node's IPC as a transport.
const connection: Connection = createConnection(ProposedFeatures.all);
const documents: TextDocuments<TextDocument> = new TextDocuments(TextDocument);
documents.listen(connection);

// Sets up the connection's initialization event handler.
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

// Registers a callback when the connection is fully initialized.
connection.onInitialized(() => {
    if (hasConfigurationCapability) {
        // Register for all configuration changes.
        connection.client.register(DidChangeConfigurationNotification.type, undefined);
    }
});

const server = new AnalysisLSPServer(connection);

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

// Registering a callback when the configuration changes.
connection.onDidChangeConfiguration(() => {
    if (hasConfigurationCapability) {
        // Fetching the workspace configuration from the client.
        server.conn.workspace.getConfiguration()
        .then((data) => {
            // Updating global settings based on the fetched configuration data.
            globalConfig.updateConfig(data);
        });
    }
});

connection.onCodeAction((params): CodeAction[] => {
    return getDiagnosticsCodeActions(params.context.diagnostics, path.basename(params.textDocument.uri));
});

connection.listen();

export { connection };
