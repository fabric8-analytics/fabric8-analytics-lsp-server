/* --------------------------------------------------------------------------------------------
 * Copyright (c) Red Hat
 * Licensed under the Apache-2.0 License. See License.txt in the project root for license information.
 * ------------------------------------------------------------------------------------------ */
'use strict';

import { Diagnostic } from 'vscode-languageserver';

import { DependencyData } from './dependencyAnalysis/analysis';
import { connection } from './server';
import { decodeUriPath } from './utils';

/**
 * Diagnostics Pipeline specification.
 */
interface IDiagnosticsPipeline {
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
     * @param dependencies -  A map containing dependency data from exhort.
     */
    runDiagnostics(dependencies: Map<string, DependencyData[]>);
}

abstract class AbstractDiagnosticsPipeline implements IDiagnosticsPipeline{

    protected diagnostics: Diagnostic[] = [];
    protected vulnCount: Map<string, number> = new Map<string, number>();
    
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

    abstract runDiagnostics(dependencies: Map<string, DependencyData[]>): void;
}

export { AbstractDiagnosticsPipeline };