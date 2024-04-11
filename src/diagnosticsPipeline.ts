/* --------------------------------------------------------------------------------------------
 * Copyright (c) Red Hat
 * Licensed under the Apache-2.0 License. See License.txt in the project root for license information.
 * ------------------------------------------------------------------------------------------ */
'use strict';

import { Diagnostic } from 'vscode-languageserver';

import { connection } from './server';
import { decodeUriPath } from './utils';

/**
 * Diagnostics Pipeline specification.
 * @typeparam T - The type of elements in the artifact data array.
 */
interface IDiagnosticsPipeline<T> {
    /**
     * Clears diagnostics.
     */
    clearDiagnostics();
    /**
     * Reports diagnostics to the client.
     */
    reportDiagnostics();
    /**
     * Runs diagnostics on dependencies.
     * @param artifact - A map containing artifact data.
     */
    runDiagnostics(artifact: Map<string, T[]>);
}

/**
 * Abstract class for implementing a diagnostics pipeline.
 * @typeparam T - The type of elements in the artifact data array.
 */
abstract class AbstractDiagnosticsPipeline<T> implements IDiagnosticsPipeline<T>{
     /**
     * An array to hold diagnostic information.
     */
    protected diagnostics: Diagnostic[] = [];
    /**
     * A map to hold vulnerability count information.
     */
    protected vulnCount: Map<string, number> = new Map<string, number>();
    
    /**
     * Creates an instance of AbstractDiagnosticsPipeline.
     * @param diagnosticFilePath - The path to the manifest file to retrieve diagnostics from.
     */
    constructor(protected readonly diagnosticFilePath: string) {}

    clearDiagnostics() {
        connection.sendDiagnostics({ uri: this.diagnosticFilePath, diagnostics: [] });
        connection.sendNotification('caNotification', {
            done: false,
            uri: decodeUriPath(this.diagnosticFilePath),
        });
    }

    reportDiagnostics() {
        connection.sendNotification('caNotification', {
            done: true,
            uri: decodeUriPath(this.diagnosticFilePath),
            diagCount: this.diagnostics.length,
            vulnCount: this.vulnCount,
        });
    }

    abstract runDiagnostics(artifact: Map<string, T[]>): void;
}

export { AbstractDiagnosticsPipeline };