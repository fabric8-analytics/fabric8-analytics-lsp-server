/* --------------------------------------------------------------------------------------------
 * Copyright (c) Red Hat
 * Licensed under the Apache-2.0 License. See License.txt in the project root for license information.
 * ------------------------------------------------------------------------------------------ */
'use strict';

import * as path from 'path';
import exhort from '@RHEcosystemAppEng/exhort-javascript-api';

import { connection } from './server';
import { globalConfig } from './config';
import { isDefined } from './utils';

/**
 * Represents a source object with an ID and dependencies array.
 */
interface ISource {
    id: string;
    dependencies: any[];
}

/**
 * Implementation of ISource interface.
 */
class Source implements ISource {
    constructor(
        public id: string, 
        public dependencies: any[]
    ) {}
}

/**
 * Represents data specification related to a dependency.
 */
interface IDependencyData {
    sourceId: string;
    issuesCount: number;
    highestVulnerabilitySeverity: string;
}

/**
 * Implementation of IDependencyData interface.
 */
class DependencyData implements IDependencyData {
    constructor(
        public sourceId: string,
        public issuesCount: number,
        public highestVulnerabilitySeverity: string
    ) {}
}

/**
 * Represents the parsed response of Red Hat Dependency Analysis, with dependencies mapped by string keys.
 */
interface IAnalysisResponse {
    dependencies: Map<string, DependencyData[]>;
}

/**
 * Implementation of IAnalysisResponse interface.
 */
class AnalysisResponse implements IAnalysisResponse {
    dependencies: Map<string, DependencyData[]> = new Map<string, DependencyData[]>();

    constructor(resData: exhort.AnalysisReport, diagnosticFilePath: string) {

        const failedProviders: string[] = [];
        const sources: Source[] = [];
        
        if (isDefined(resData, 'providers')) {
            Object.entries(resData.providers).map(([providerName, providerData]) => {
                if (isDefined(providerData, 'status', 'ok') && isDefined(providerData, 'sources') && providerData.status.ok) {
                    Object.entries(providerData.sources).map(([sourceName, sourceData]) => {
                        sources.push(new Source(`${providerName}(${sourceName})`, isDefined(sourceData, 'dependencies') ? sourceData.dependencies : []));
                    });
                } else {
                    failedProviders.push(providerName);
                }
            });

            if (failedProviders.length !== 0) {
                const errMsg = `The component analysis couldn't fetch data from the following providers: [${failedProviders.join(', ')}]`;
                connection.console.warn(`Component Analysis Error: ${errMsg}`);
                connection.sendNotification('caError', {
                    errorMessage: errMsg,
                    uri: diagnosticFilePath,
                });
            }

            sources.forEach(source => {
                source.dependencies.forEach(d => {
                    if (isDefined(d, 'ref') && isDefined(d, 'issues')) {
                        const dd = new DependencyData(source.id, d.issues.length, isDefined(d, 'highestVulnerability', 'severity') ? d.highestVulnerability.severity : 'NONE');
                        if (this.dependencies[d.ref] === undefined) {
                            this.dependencies[d.ref] = [];
                        }
                        this.dependencies[d.ref].push(dd);
                    }
                });
            });
        }
    }
}

/**
 * Performs RHDA component analysis on provided manifest contents and fileType based on ecosystem.
 * @param fileType - The type of file (e.g., 'pom.xml', 'package.json', 'go.mod', 'requirements.txt').
 * @param contents - The contents of the manifest file to analyze.
 * @returns A Promise resolving to an AnalysisResponse object.
 */
async function executeComponentAnalysis (diagnosticFilePath: string, contents: string): Promise<AnalysisResponse> {
    
    // Define configuration options for the component analysis request
    const options = {
        'RHDA_TOKEN': globalConfig.telemetryId,
        'RHDA_SOURCE': globalConfig.utmSource,
        'MATCH_MANIFEST_VERSIONS': globalConfig.matchManifestVersions,
        'EXHORT_MVN_PATH': globalConfig.exhortMvnPath,
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
    if (globalConfig.exhortOSSIndexUser !== '' && globalConfig.exhortOSSIndexToken !== '') {
        options['EXHORT_OSS_INDEX_USER'] = globalConfig.exhortOSSIndexUser;
        options['EXHORT_OSS_INDEX_TOKEN'] = globalConfig.exhortOSSIndexToken;
    }

    const componentAnalysisJson = await exhort.componentAnalysis(path.basename(diagnosticFilePath), contents, options); // Execute component analysis

    return new AnalysisResponse(componentAnalysisJson, diagnosticFilePath);
}

export { executeComponentAnalysis, DependencyData };