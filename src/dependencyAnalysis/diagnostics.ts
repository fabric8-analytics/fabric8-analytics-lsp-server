/* --------------------------------------------------------------------------------------------
 * Copyright (c) Red Hat
 * Licensed under the Apache-2.0 License. See License.txt in the project root for license information.
 * ------------------------------------------------------------------------------------------ */
'use strict';

import { Diagnostic } from 'vscode-languageserver';

import { DependencyMap, IDependencyProvider, getRange } from '../dependencyAnalysis/collector';
import { IPositionedContext } from '../positionTypes';
import { executeComponentAnalysis, DependencyData } from './analysis';
import { Vulnerability } from '../vulnerability';
import { connection } from '../server';
import { VERSION_PLACEHOLDER } from '../constants';
import { clearCodeActionsMap, registerCodeAction, generateSwitchToRecommendedVersionAction } from '../codeActionHandler';
import { decodeUriPath } from '../utils';
import { AbstractDiagnosticsPipeline } from '../diagnosticsPipeline';

/**
 * Implementation of DiagnosticsPipeline interface.
 */
class DiagnosticsPipeline extends AbstractDiagnosticsPipeline {

    constructor(
        private dependencyMap: DependencyMap,
        diagnosticFilePath: string,
    ) {
        super(diagnosticFilePath);
    }

    runDiagnostics(dependencies: Map<string, DependencyData[]>) {
        Object.entries(dependencies).map(([ref, dependencyData]) => {
            const dependencyRef = ref.split('@')[0];
            const dependency = this.dependencyMap.get(dependencyRef);

            if (dependency) {
                const vulnerability = new Vulnerability(
                    getRange(dependency),
                    ref,
                    dependencyData,
                );
                
                const vulnerabilityDiagnostic = vulnerability.getDiagnostic();
                this.diagnostics.push(vulnerabilityDiagnostic);

                const loc = vulnerabilityDiagnostic.range.start.line + '|' + vulnerabilityDiagnostic.range.start.character;

                dependencyData.forEach(dd => {
    
                    const actionRef = vulnerabilityDiagnostic.severity < 3 ? dd.remediationRef : dd.recommendationRef;

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
        const dependency = ref;
        const switchToVersion = dependency.split('@')[1];
        const versionReplacementString = context ? context.value.replace(VERSION_PLACEHOLDER, switchToVersion) : switchToVersion;
        const title = `Switch to version ${switchToVersion} for ${sourceId}`;
        const codeAction = generateSwitchToRecommendedVersionAction(title, dependency, versionReplacementString, vulnerabilityDiagnostic, this.diagnosticFilePath);
        registerCodeAction(this.diagnosticFilePath, loc, codeAction);
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
    try {        
        const dependencies = await provider.collect(contents);
        const dependencyMap = new DependencyMap(dependencies);

        const diagnosticsPipeline = new DiagnosticsPipeline(dependencyMap, diagnosticFilePath);
        diagnosticsPipeline.clearDiagnostics();

        const response = await executeComponentAnalysis(diagnosticFilePath, contents, provider);

        clearCodeActionsMap(diagnosticFilePath);

        diagnosticsPipeline.runDiagnostics(response.dependencies);

        diagnosticsPipeline.reportDiagnostics();
    } catch (error) {
        connection.console.warn(`Component Analysis Error: ${error}`);
        connection.sendNotification('caError', {
            errorMessage: error.message,
            uri: decodeUriPath(diagnosticFilePath),
        });
    }
}

export { performDiagnostics };