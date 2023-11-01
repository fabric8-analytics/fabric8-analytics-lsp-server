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

enum EventStream {
    Invalid,
    Diagnostics
}

interface IAnalysisFileHandlerCallback {
    (uri: string, contents: string): void;
}

interface IAnalysisFileHandler {
    stream: EventStream;
    matcher: RegExp;
    callback: IAnalysisFileHandlerCallback;
}

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

interface IAnalysisFiles {
    handlers: Array<IAnalysisFileHandler>;
    fileData: Map<string, string>;
    on(stream: EventStream, matcher: string, cb: IAnalysisFileHandlerCallback): IAnalysisFiles;
    run(stream: EventStream, uri: string, file: string, contents: string): any;
}

class AnalysisFiles implements IAnalysisFiles {
    constructor(
        public handlers: Array<IAnalysisFileHandler> = [],
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

interface IAnalysisLSPServer {
    conn: Connection;
    files: IAnalysisFiles;

    handleFileEvent(uri: string, contents: string): void;
}

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