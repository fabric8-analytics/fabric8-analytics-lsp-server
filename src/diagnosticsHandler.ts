/* --------------------------------------------------------------------------------------------
 * Copyright (c) Red Hat
 * Licensed under the Apache-2.0 License. See License.txt in the project root for license information.
 * ------------------------------------------------------------------------------------------ */
'use strict';

import { Diagnostic } from 'vscode-languageserver';
import { DependencyMap, IDependencyProvider, getRange } from './collector';
import { executeComponentAnalysis, DependencyData } from './componentAnalysis';
import { Vulnerability } from './vulnerability';
import { connection } from './server';

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

/**
 * Implementation of DiagnosticsPipeline interface.
 */
class DiagnosticsPipeline implements IDiagnosticsPipeline {
    private diagnostics: Diagnostic[] = [];
    private vulnCount: number = 0;

    constructor(
        private provider: IDependencyProvider,
        private dependencyMap: DependencyMap,
        private diagnosticFilePath: string,
    ) {}

    clearDiagnostics() {
        connection.sendDiagnostics({ uri: this.diagnosticFilePath, diagnostics: [] });
        connection.sendNotification('caNotification', {
            done: false,
            uri: this.diagnosticFilePath,
        });
    }

    reportDiagnostics() {
        connection.sendNotification('caNotification', {
            done: true,
            uri: this.diagnosticFilePath,
            diagCount: this.diagnostics.length,
            vulnCount: this.vulnCount,
        });
    }

    runDiagnostics(dependencies: Map<string, DependencyData[]>) {
        Object.entries(dependencies).map(([ref, dependencyData]) => {
            const dependency = this.dependencyMap.get(this.provider.resolveDependencyFromReference(ref).split('@')[0]);
            if (dependency !== undefined) {
                const vulnerability = new Vulnerability(
                    this.provider,
                    getRange(dependency),
                    ref,
                    dependencyData,
                );
                
                const vulnerabilityDiagnostic = vulnerability.getDiagnostic();
                if (vulnerabilityDiagnostic) {
                    this.diagnostics.push(vulnerabilityDiagnostic);
                }
            
                const totalIssuesCount: number = dependencyData.reduce(
                    (sum, currentItem) => sum + currentItem.issuesCount,
                    0
                );
                this.vulnCount += totalIssuesCount;
            }
            connection.sendDiagnostics({ uri: this.diagnosticFilePath, diagnostics: this.diagnostics });
        });
    }
}

/**
 * Performs diagnostics on the provided manifest file contents.
 * @param diagnosticFilePath - The path to the manifest file.
 * @param contents - The contents of the manifest file.
 * @param provider - The dependency provider of the corresponding ecosystem.
 * @returns A Promise that resolves when diagnostics are completed.
 */
async function performDiagnostics(diagnosticFilePath: string, contents: string, provider: IDependencyProvider) {
    
    // collect dependencies from manifest file
    let dependencies = null;
    dependencies = await provider.collect(contents)
        .catch(error => {
            connection.console.warn(`Component Analysis Error: ${error}`);
            connection.sendNotification('caError', {
                error: error,
                uri: diagnosticFilePath,
            });
            return;
        });
    const dependencyMap = new DependencyMap(dependencies);

    const diagnosticsPipeline = new DiagnosticsPipeline(provider, dependencyMap, diagnosticFilePath);
    
    diagnosticsPipeline.clearDiagnostics();

    const analysis = executeComponentAnalysis(diagnosticFilePath, contents)
        .then(response => {
            diagnosticsPipeline.runDiagnostics(response.dependencies);
        })
        .catch(error => {
            connection.console.warn(`Component Analysis Error: ${error}`);
            connection.sendNotification('caError', {
                error: error,
                uri: diagnosticFilePath,
            });
            return;
        });

    await analysis;

    diagnosticsPipeline.reportDiagnostics();
}

export { performDiagnostics };