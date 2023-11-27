/* --------------------------------------------------------------------------------------------
 * Copyright (c) Red Hat
 * Licensed under the Apache-2.0 License. See License.txt in the project root for 
 * license information.
 * ------------------------------------------------------------------------------------------ */
'use strict';

/**
 * Represents the global configuration settings.
 */
class Config
{
    triggerFullStackAnalysis:  string;
    telemetryId:               string;
    utmSource:                 string;
    exhortSnykToken:           string;
    exhortOSSIndexUser:        string;
    exhortOSSIndexToken:       string;
    matchManifestVersions:     string;
    exhortMvnPath:             string;
    exhortNpmPath:             string;
    exhortGoPath:              string;
    exhortPython3Path:         string;
    exhortPip3Path:            string;
    exhortPythonPath:          string;
    exhortPipPath:             string;

    /**
     * Initializes a new instance of the Config class with default values from the parent process environment variable data.
     */
    constructor() {
        this.triggerFullStackAnalysis = process.env.VSCEXT_TRIGGER_FULL_STACK_ANALYSIS || '';
        this.telemetryId = process.env.VSCEXT_TELEMETRY_ID || '';
        this.utmSource = process.env.VSCEXT_UTM_SOURCE || '';
        this.exhortSnykToken = process.env.VSCEXT_EXHORT_SNYK_TOKEN || '';
        this.exhortOSSIndexUser = process.env.VSCEXT_EXHORT_OSS_INDEX_USER || '';
        this.exhortOSSIndexToken = process.env.VSCEXT_EXHORT_OSS_INDEX_TOKEN || '';
        this.matchManifestVersions = process.env.VSCEXT_MATCH_MANIFEST_VERSIONS || 'true';
        this.exhortMvnPath = process.env.VSCEXT_EXHORT_MVN_PATH || 'mvn';
        this.exhortNpmPath = process.env.VSCEXT_EXHORT_NPM_PATH || 'npm';
        this.exhortGoPath = process.env.VSCEXT_EXHORT_GO_PATH || 'go';
        this.exhortPython3Path = process.env.VSCEXT_EXHORT_PYTHON3_PATH || 'python3';
        this.exhortPip3Path = process.env.VSCEXT_EXHORT_PIP3_PATH || 'pip3';
        this.exhortPythonPath = process.env.VSCEXT_EXHORT_PYTHON_PATH || 'python';
        this.exhortPipPath = process.env.VSCEXT_EXHORT_PIP_PATH || 'pip';
    }

    /**
     * Updates the global configuration with provided data from extension workspace settings.
     * @param data - The data from extension workspace settings to update the global configuration with.
     */
    updateConfig( data: any ) {
        this.exhortSnykToken = data.redHatDependencyAnalytics.exhortSnykToken;
        this.exhortOSSIndexUser = data.redHatDependencyAnalytics.exhortOSSIndexUser;
        this.exhortOSSIndexToken = data.redHatDependencyAnalytics.exhortOSSIndexToken;
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

/**
 * Represents the global configuration instance based on Config class.
 */
const globalConfig = new Config();

export { Config, globalConfig };
