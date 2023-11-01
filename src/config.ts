/* --------------------------------------------------------------------------------------------
 * Copyright (c) Red Hat
 * Licensed under the Apache-2.0 License. See License.txt in the project root for 
 * license information.
 * ------------------------------------------------------------------------------------------ */
'use strict';

export class Config
{
    triggerFullStackAnalysis:  string;
    triggerRHRepositoryRecommendationNotification:  string;
    telemetryId:             string;
    utmSource:               string;
    exhortDevMode:           string;
    exhortSnykToken:         string;
    matchManifestVersions:   string;
    exhortMvnPath:           string;
    exhortNpmPath:           string;
    exhortGoPath:            string;
    exhortPython3Path:       string;
    exhortPip3Path:          string;
    exhortPythonPath:        string;
    exhortPipPath:           string;

    constructor() {
        // init child process configuration with parent process environment data
        this.triggerFullStackAnalysis = process.env.VSCEXT_TRIGGER_FULL_STACK_ANALYSIS || '';
        this.triggerRHRepositoryRecommendationNotification = process.env.VSCEXT_TRIGGER_REDHAT_REPOSITORY_RECOMMENDATION_NOTIFICATION || '';
        this.telemetryId = process.env.VSCEXT_TELEMETRY_ID || '';
        this.utmSource = process.env.VSCEXT_UTM_SOURCE || '';
        this.exhortDevMode = process.env.VSCEXT_EXHORT_DEV_MODE || 'false';
        this.exhortSnykToken = process.env.VSCEXT_EXHORT_SNYK_TOKEN || '';
        this.matchManifestVersions = process.env.VSCEXT_MATCH_MANIFEST_VERSIONS || 'true';
        this.exhortMvnPath = process.env.VSCEXT_EXHORT_MVN_PATH || 'mvn';
        this.exhortNpmPath = process.env.VSCEXT_EXHORT_NPM_PATH || 'npm';
        this.exhortGoPath = process.env.VSCEXT_EXHORT_GO_PATH || 'go';
        this.exhortPython3Path = process.env.VSCEXT_EXHORT_PYTHON3_PATH || 'python3';
        this.exhortPip3Path = process.env.VSCEXT_EXHORT_PIP3_PATH || 'pip3';
        this.exhortPythonPath = process.env.VSCEXT_EXHORT_PYTHON_PATH || 'python';
        this.exhortPipPath = process.env.VSCEXT_EXHORT_PIP_PATH || 'pip';
    }

    updateConfig( data: any ) {
        this.exhortSnykToken = data.redHatDependencyAnalytics.exhortSnykToken;
        this.matchManifestVersions = data.redHatDependencyAnalytics.matchManifestVersions ? 'true' : 'false';
        this.exhortMvnPath = data.mvn.executable.path || 'mvn';
        this.exhortNpmPath = data.npm.executable.path || 'npm';
        this.exhortGoPath = data.go.executable.path || 'go';
        this.exhortPython3Path = data.python3.executable.path || 'python3';
        this.exhortPip3Path = data.pip3.executable.path || 'pip3';
        this.exhortPythonPath = data.python.executable.path || 'python';
        this.exhortPipPath = data.pip.executable.path || 'pip';
    }
}

const globalConfig = new Config();

export { globalConfig };
