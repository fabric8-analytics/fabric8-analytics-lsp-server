/* --------------------------------------------------------------------------------------------
 * Copyright (c) Red Hat
 * Licensed under the Apache-2.0 License. See License.txt in the project root for license information.
 * ------------------------------------------------------------------------------------------ */
'use strict';

import * as path from 'path';

import { Connection } from 'vscode-languageserver';
import { performDiagnostics } from './diagnosticsHandler';
import { DependencyProvider as PackageJson } from './providers/package.json';
import { DependencyProvider as PomXml } from './providers/pom.xml';
import { DependencyProvider as GoMod } from './providers/go.mod';
import { DependencyProvider as RequirementsTxt } from './providers/requirements.txt';

/**
 * Describes the available event streams.
 */
enum EventStream {
    Invalid,
    Diagnostics
}

/**
 * Callback signature for file handling in analysis.
 */
interface IAnalysisFileHandlerCallback {
    (uri: string, contents: string): void;
}

/**
 * Describes the structure of a file handler in analysis.
 */
interface IAnalysisFileHandler {
    stream: EventStream;
    matcher: RegExp;
    callback: IAnalysisFileHandlerCallback;
}

/**
 * Implementation of a file handler in analysis.
 */
class AnalysisFileHandler implements IAnalysisFileHandler {
    matcher: RegExp;

    constructor(
        public stream: EventStream, 
        matcher: string, 
        public callback: IAnalysisFileHandlerCallback
    ) {
        this.matcher = new RegExp(matcher);
    }
}

/**
 * Describes the collection of file handlers and file data for analysis.
 */
interface IAnalysisFiles {
    handlers: IAnalysisFileHandler[];
    fileData: Map<string, string>;

    /**
     * Assigns a file handler for a specific set of event stream, matcher and callback function.
     * @param stream - The event stream to handle.
     * @param matcher - The regular expression pattern to match filenames.
     * @param cb - The callback function to handle the file.
     * @returns IAnalysisFiles onject with an updated collection of file handlers.
     */
    on(stream: EventStream, matcher: string, cb: IAnalysisFileHandlerCallback): IAnalysisFiles;
    
    /**
     * Executes file handler callback function based on given event stream and regular expression pattern match.
     * @param stream - The event stream to execute handling.
     * @param uri - The URI of the file.
     * @param fileName - The base name of the file.
     * @param contents - The contents of the file.
     * @returns The result of file handling execution.
     */
    run(stream: EventStream, uri: string, file: string, contents: string): any;
}

/**
 * Implementation of a collection of file handlers and file data for analysis.
 */
class AnalysisFiles implements IAnalysisFiles {
    constructor(
        public handlers: IAnalysisFileHandler[] = [],
        public fileData: Map<string, string> = new Map<string, string>()
    ) {}
    on(stream: EventStream, matcher: string, cb: IAnalysisFileHandlerCallback): IAnalysisFiles {
        this.handlers.push(new AnalysisFileHandler(stream, matcher, cb));
        return this;
    }
    run(stream: EventStream, uri: string, fileName: string, contents: string): any {
        for (const handler of this.handlers) {
            if (handler.stream === stream && handler.matcher.test(fileName)) {
                return handler.callback(uri, contents);
            }
        }
    }
}

const files = new AnalysisFiles();

files.on(EventStream.Diagnostics, '^package\\.json$', (uri, contents) => {
    performDiagnostics(uri, contents, new PackageJson());
});

files.on(EventStream.Diagnostics, '^pom\\.xml$', (uri, contents) => {
    performDiagnostics(uri, contents, new PomXml());
});

files.on(EventStream.Diagnostics, '^go\\.mod$', (uri, contents) => {
    performDiagnostics(uri, contents, new GoMod());
});

files.on(EventStream.Diagnostics, '^requirements\\.txt$', (uri, contents) => {
    performDiagnostics(uri, contents, new RequirementsTxt());
});

/**
 * Describes the LSP server for analysis.
 */
interface IAnalysisLSPServer {
    conn: Connection;
    files: IAnalysisFiles;
    
    /**
     * Handles a file event in the LSP server.
     * @param uri - The URI of the file.
     * @param contents - The contents of the file.
     */
    handleFileEvent(uri: string, contents: string): void;
}

/**
 * Implementation of the LSP server for analysis.
 */
class AnalysisLSPServer implements IAnalysisLSPServer {
    files: IAnalysisFiles = files;

    constructor(
        public conn: Connection, 
    ) {}

    handleFileEvent(uri: string, contents: string): void {
        const fileName = path.basename(uri);
        this.files.fileData[uri] = contents;
        this.files.run(EventStream.Diagnostics, uri, fileName, contents);
    }
}

export { IAnalysisLSPServer, AnalysisLSPServer };