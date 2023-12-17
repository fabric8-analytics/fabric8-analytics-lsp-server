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
import { VERSION_PLACEHOLDER } from './constants';
import { clearCodeActionsMap, registerCodeAction, generateSwitchToRecommendedVersionAction } from './codeActionHandler';
import { IPositionedContext } from './collector';

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
    private vulnCount: Map<string, number> = new Map<string, number>();

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
            const dependencyRef = this.provider.resolveDependencyFromReference(ref).split('@')[0];
            const dependency = this.dependencyMap.get(dependencyRef);

            if (dependency) {
                const vulnerability = new Vulnerability(
                    this.provider,
                    getRange(dependency),
                    ref,
                    dependencyData,
                );
                
                const vulnerabilityDiagnostic = vulnerability.getDiagnostic();
                this.diagnostics.push(vulnerabilityDiagnostic);

                const loc = vulnerabilityDiagnostic.range.start.line + '|' + vulnerabilityDiagnostic.range.start.character;

                dependencyData.forEach(dd => {
    
                    const actionRef = vulnerabilityDiagnostic.severity === 1 ? dd.remediationRef : dd.recommendationRef;

                    if (actionRef) {
                        this.createCodeAction(loc, actionRef, dependency.context, dd.sourceId, vulnerabilityDiagnostic);
                    }
    
                    const vulnProvider = dd.sourceId.split('(')[0];
                    const issuesCount = dd.issuesCount;
                    this.vulnCount[vulnProvider] = (this.vulnCount[vulnProvider] || 0) + issuesCount;
                });      
            }
            connection.sendDiagnostics({ uri: this.diagnosticFilePath, diagnostics: this.diagnostics });
        });
    }

    /**
     * Creates a code action.
     * @param loc - Location of code action effect.
     * @param ref - The reference name of the recommended package.
     * @param context - Dependency context object.
     * @param sourceId - Source ID.
     * @param vulnerabilityDiagnostic - Vulnerability diagnostic object.
     * @private
     */
    private createCodeAction(loc: string, ref: string, context: IPositionedContext, sourceId: string, vulnerabilityDiagnostic: Diagnostic) {
        const switchToVersion = this.provider.resolveDependencyFromReference(ref).split('@')[1];
        const versionReplacementString = context ? context.value.replace(VERSION_PLACEHOLDER, switchToVersion) : switchToVersion;
        const title = `Switch to version ${switchToVersion} for ${sourceId}`;
        const codeAction = generateSwitchToRecommendedVersionAction(title, versionReplacementString, vulnerabilityDiagnostic, this.diagnosticFilePath);
        registerCodeAction(loc, codeAction);
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
                errorMessage: error.message,
                uri: diagnosticFilePath,
            });
            return;
        });
    const dependencyMap = new DependencyMap(dependencies);

    const diagnosticsPipeline = new DiagnosticsPipeline(provider, dependencyMap, diagnosticFilePath);
    
    clearCodeActionsMap();

    diagnosticsPipeline.clearDiagnostics();

    const analysis = executeComponentAnalysis(diagnosticFilePath, contents)
        .then(response => {
            diagnosticsPipeline.runDiagnostics(response.dependencies);
        })
        .catch(error => {
            connection.console.warn(`Component Analysis Error: ${error}`);
            connection.sendNotification('caError', {
                errorMessage: error.message,
                uri: diagnosticFilePath,
            });
            return;
        });

    await analysis;

    diagnosticsPipeline.reportDiagnostics();
}

export { performDiagnostics };