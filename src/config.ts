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
    stackAnalysisCommand:                           string;
    rhRepositoryRecommendationNotificationCommand:  string;
    telemetryId:                                    string;
    utmSource:                                      string;
    exhortSnykToken:                                string;
    matchManifestVersions:                          string;
    usePythonVirtualEnvironment:                    string;
    useGoMVS:                                       string;
    enablePythonBestEffortsInstallation:            string;
    usePipDepTree:                                  string;
    vulnerabilityAlertSeverity:                     string;
    exhortMvnPath:                                  string;
    exhortNpmPath:                                  string;
    exhortGoPath:                                   string;
    exhortPython3Path:                              string;
    exhortPip3Path:                                 string;
    exhortPythonPath:                               string;
    exhortPipPath:                                  string;

    /**
     * Initializes a new instance of the Config class with default values from the parent process environment variable data.
     */
    constructor() {
        this.load();
    }

    load() {
        this.stackAnalysisCommand = process.env.VSCEXT_STACK_ANALYSIS_COMMAND || '';
        this.rhRepositoryRecommendationNotificationCommand = process.env.VSCEXT_REDHAT_REPOSITORY_RECOMMENDATION_NOTIFICATION_COMMAND || '';
        this.telemetryId = process.env.VSCEXT_TELEMETRY_ID || '';
        this.utmSource = process.env.VSCEXT_UTM_SOURCE || '';
        this.exhortSnykToken = process.env.VSCEXT_EXHORT_SNYK_TOKEN || '';
        this.matchManifestVersions = process.env.VSCEXT_MATCH_MANIFEST_VERSIONS || 'true';
        this.usePythonVirtualEnvironment = process.env.VSCEXT_USE_PYTHON_VIRTUAL_ENVIRONMENT || 'false';
        this.useGoMVS = process.env.VSCEXT_USE_GO_MVS || 'false';
        this.enablePythonBestEffortsInstallation = process.env.VSCEXT_ENABLE_PYTHON_BEST_EFFORTS_INSTALLATION || 'false';
        this.usePipDepTree = process.env.VSCEXT_USE_PIP_DEP_TREE || 'false';
        this.vulnerabilityAlertSeverity = process.env.VSCEXT_VULNERABILITY_ALERT_SEVERITY || 'Error';
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
    updateConfig( rhdaData: any ) {
        this.matchManifestVersions = rhdaData.matchManifestVersions ? 'true' : 'false';
        this.usePythonVirtualEnvironment = rhdaData.usePythonVirtualEnvironment ? 'true' : 'false';
        this.useGoMVS = rhdaData.useGoMVS ? 'true' : 'false';
        this.enablePythonBestEffortsInstallation = rhdaData.enablePythonBestEffortsInstallation ? 'true' : 'false';
        this.usePipDepTree = rhdaData.usePipDepTree ? 'true' : 'false';
        this.vulnerabilityAlertSeverity = rhdaData.vulnerabilityAlertSeverity;
        this.exhortMvnPath = rhdaData.mvn.executable.path || 'mvn';
        this.exhortNpmPath = rhdaData.npm.executable.path || 'npm';
        this.exhortGoPath = rhdaData.go.executable.path || 'go';
        this.exhortPython3Path = rhdaData.python3.executable.path || 'python3';
        this.exhortPip3Path = rhdaData.pip3.executable.path || 'pip3';
        this.exhortPythonPath = rhdaData.python.executable.path || 'python';
        this.exhortPipPath = rhdaData.pip.executable.path || 'pip';
    }

    /**
     * Sets the Snyk token.
     * @param token The Snyk token to be set.
     */
    setExhortSnykToken( token: string ) {
        this.exhortSnykToken = token;
    }
}

/**
 * Represents the global configuration instance based on Config class.
 */
export const globalConfig = new Config();
