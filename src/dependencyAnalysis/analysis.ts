/* --------------------------------------------------------------------------------------------
 * Copyright (c) Red Hat
 * Licensed under the Apache-2.0 License. See License.txt in the project root for license information.
 * ------------------------------------------------------------------------------------------ */
'use strict';

import * as path from 'path';
import exhort from '@RHEcosystemAppEng/exhort-javascript-api';

import { connection } from '../server';
import { globalConfig } from '../config';
import { isDefined, decodeUriPath } from '../utils';
import { IDependencyProvider } from '../dependencyAnalysis/collector';

/**
 * Represents a source object with an ID and dependencies array.
 */
interface ISource {
    id: string;
    dependencies: any[];
}

/**
 * Represents data specification related to a dependency.
 */
interface IDependencyData {
    sourceId: string;
    issuesCount: number;
    recommendationRef: string;
    remediationRef: string
    highestVulnerabilitySeverity: string;
}

/**
 * Implementation of IDependencyData interface.
 */
class DependencyData implements IDependencyData {
    constructor(
        public sourceId: string,
        public issuesCount: number,
        public recommendationRef: string,
        public remediationRef: string,
        public highestVulnerabilitySeverity: string
    ) {}
}

/**
 * Represents the parsed response of Red Hat Dependency Analytics (RHDA) analysis, with dependencies mapped by reference string.
 */
interface IAnalysisResponse {
    dependencies: Map<string, DependencyData[]>;
}

/**
 * Implementation of IAnalysisResponse interface.
 */
class AnalysisResponse implements IAnalysisResponse {
    dependencies: Map<string, DependencyData[]> = new Map<string, DependencyData[]>();
    provider: IDependencyProvider;

    constructor(resData: exhort.AnalysisReport, diagnosticFilePath: string, provider: IDependencyProvider) {

        this.provider = provider;
        const failedProviders: string[] = [];
        const sources: ISource[] = [];
        
        if (isDefined(resData, 'providers')) {
            Object.entries(resData.providers).map(([providerName, providerData]) => {
                if (isDefined(providerData, 'status', 'ok') && providerData.status.ok) {
                    if (isDefined(providerData, 'sources')) {
                        Object.entries(providerData.sources).map(([sourceName, sourceData]) => {
                            sources.push({id:`${providerName}(${sourceName})`, dependencies: this.getDependencies(sourceData)});
                        });
                    }
                } else {
                    failedProviders.push(providerName);
                }
            });

            if (failedProviders.length !== 0) {
                const errMsg = `The component analysis couldn't fetch data from the following providers: [${failedProviders.join(', ')}]`;
                connection.console.warn(`Component Analysis Error: ${errMsg}`);
                connection.sendNotification('caError', {
                    errorMessage: errMsg,
                    uri: decodeUriPath(diagnosticFilePath),
                });
            }

            sources.forEach(source => {
                source.dependencies.forEach(d => {
                    if (isDefined(d, 'ref')) {

                        const issuesCount: number = isDefined(d, 'issues') ? d.issues.length : 0;

                        const dd = issuesCount
                            ? new DependencyData(source.id, issuesCount, '', this.getRemediation(d.issues[0]), this.getHighestSeverity(d))
                            : new DependencyData(source.id, issuesCount, this.getRecommendation(d), '', this.getHighestSeverity(d));

                        const resolvedRef = this.provider.resolveDependencyFromReference(d.ref);
                        this.dependencies[resolvedRef] = this.dependencies[resolvedRef] || [];
                        this.dependencies[resolvedRef].push(dd);
                    }
                });
            });
        }
    }

    /**
     * Retrieves dependencies from source.
     * @param sourceData The source object.
     * @returns An array of dependencies or empty array if none exists.
     * @private
     */
    private getDependencies(sourceData: any): any[] {
        return isDefined(sourceData, 'dependencies') ? sourceData.dependencies : [];
    }
    
    /**
     * Retrieves the highest vulnerability severity value from a dependency.
     * @param dependency The dependency object.
     * @returns The highest severity level or NONE if none exists.
     * @private
     */
    private getHighestSeverity(dependency: any): string {
        return isDefined(dependency, 'highestVulnerability', 'severity') ? dependency.highestVulnerability.severity : 'NONE';
    }
    
    /**
     * Retrieves the remediation reference from an issue.
     * @param issue The issue object.
     * @returns The remediation reference or empty string if none exists.
     * @private
     */
    private getRemediation(issue: any): string {
        return isDefined(issue, 'remediation', 'trustedContent', 'ref') ? this.provider.resolveDependencyFromReference(issue.remediation.trustedContent.ref.split('?')[0]) : '';
    }

    /**
     * Retrieves the recommendation reference from a dependency.
     * @param dependency The dependency object.
     * @returns The recommendation reference or empty string if none exists.
     * @private
     */
    private getRecommendation(dependency: any): string {
        return isDefined(dependency, 'recommendation') ? this.provider.resolveDependencyFromReference(dependency.recommendation.split('?')[0]) : '';
    }
}

/**
 * Performs RHDA component analysis on provided manifest contents/path and fileType based on ecosystem.
 * @param diagnosticFilePath - The path to the manifest file to analyze.
 * @param contents - The contents of the manifest file to analyze.
 * @param provider - The dependency provider of the corresponding ecosystem.
 * @returns A Promise resolving to an AnalysisResponse object.
 */
async function executeComponentAnalysis (diagnosticFilePath: string, contents: string, provider: IDependencyProvider): Promise<AnalysisResponse> {
    
    // Define configuration options for the component analysis request
    const options = {
        'RHDA_TOKEN': globalConfig.telemetryId,
        'RHDA_SOURCE': globalConfig.utmSource,
        'MATCH_MANIFEST_VERSIONS': globalConfig.matchManifestVersions,
        'EXHORT_PYTHON_VIRTUAL_ENV': globalConfig.usePythonVirtualEnvironment,
        'EXHORT_GO_MVS_LOGIC_ENABLED': globalConfig.useGoMVS,
        'EXHORT_PYTHON_INSTALL_BEST_EFFORTS': globalConfig.enablePythonBestEffortsInstallation,
        'EXHORT_PIP_USE_DEP_TREE': globalConfig.usePipDepTree,
        'EXHORT_MVN_PATH': globalConfig.exhortMvnPath,
        'EXHORT_GRADLE_PATH': globalConfig.exhortGradlePath,
        'EXHORT_NPM_PATH': globalConfig.exhortNpmPath,
        'EXHORT_GO_PATH': globalConfig.exhortGoPath,
        'EXHORT_PYTHON3_PATH': globalConfig.exhortPython3Path,
        'EXHORT_PIP3_PATH': globalConfig.exhortPip3Path,
        'EXHORT_PYTHON_PATH': globalConfig.exhortPythonPath,
        'EXHORT_PIP_PATH': globalConfig.exhortPipPath
    };
    if (globalConfig.exhortSnykToken !== '') {
        options['EXHORT_SNYK_TOKEN'] = globalConfig.exhortSnykToken;
    }

    const componentAnalysisJson = await exhort.componentAnalysis(path.basename(diagnosticFilePath), contents, options, decodeUriPath(diagnosticFilePath)); // Execute component analysis

    return new AnalysisResponse(componentAnalysisJson, diagnosticFilePath, provider);
}

export { executeComponentAnalysis, DependencyData };