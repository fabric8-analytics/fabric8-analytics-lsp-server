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
    trackRecommendationAcceptanceCommand:           string;
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
    exhortGradlePath:                               string;
    exhortNpmPath:                                  string;
    exhortGoPath:                                   string;
    exhortPython3Path:                              string;
    exhortPip3Path:                                 string;
    exhortPythonPath:                               string;
    exhortPipPath:                                  string;
    exhortSyftPath:                                 string;
    exhortSyftConfigPath:                           string;
    exhortSkopeoPath:                               string;
    exhortSkopeoConfigPath:                         string;
    exhortDockerPath:                               string;
    exhortPodmanPath:                               string;
    exhortImagePlatform:                            string;

    private readonly DEFAULT_VULNERABILITY_ALERT_SEVERITY = 'Error';
    private readonly DEFAULT_MVN_EXECUTABLE = 'mvn';
    private readonly DEFAULT_GRADLE_EXECUTABLE = 'gradle';
    private readonly DEFAULT_NPM_EXECUTABLE = 'npm';
    private readonly DEFAULT_GO_EXECUTABLE = 'go';
    private readonly DEFAULT_PYTHON3_EXECUTABLE = 'python3';
    private readonly DEFAULT_PIP3_EXECUTABLE = 'pip3';
    private readonly DEFAULT_PYTHON_EXECUTABLE = 'python';
    private readonly DEFAULT_PIP_EXECUTABLE = 'pip';
    private readonly DEFAULT_SYFT_EXECUTABLE = 'syft';
    private readonly DEFAULT_SKOPEO_EXECUTABLE = 'skopeo';
    private readonly DEFAULT_DOCKER_EXECUTABLE = 'docker';
    private readonly DEFAULT_PODMAN_EXECUTABLE = 'podman';

    /**
     * Initializes a new instance of the Config class with default values from the parent process environment variable data.
     */
    constructor() {
        this.load();
    }

    load() {
        this.stackAnalysisCommand = process.env.VSCEXT_STACK_ANALYSIS_COMMAND || '';
        this.trackRecommendationAcceptanceCommand = process.env.VSCEXT_TRACK_RECOMMENDATION_ACCEPTANCE_COMMAND || '';
        this.telemetryId = process.env.VSCEXT_TELEMETRY_ID || '';
        this.utmSource = process.env.VSCEXT_UTM_SOURCE || '';
        this.exhortSnykToken = process.env.VSCEXT_EXHORT_SNYK_TOKEN || '';
        this.matchManifestVersions = process.env.VSCEXT_MATCH_MANIFEST_VERSIONS || 'true';
        this.usePythonVirtualEnvironment = process.env.VSCEXT_USE_PYTHON_VIRTUAL_ENVIRONMENT || 'false';
        this.useGoMVS = process.env.VSCEXT_USE_GO_MVS || 'false';
        this.enablePythonBestEffortsInstallation = process.env.VSCEXT_ENABLE_PYTHON_BEST_EFFORTS_INSTALLATION || 'false';
        this.usePipDepTree = process.env.VSCEXT_USE_PIP_DEP_TREE || 'false';
        this.vulnerabilityAlertSeverity = process.env.VSCEXT_VULNERABILITY_ALERT_SEVERITY || this.DEFAULT_VULNERABILITY_ALERT_SEVERITY;
        this.exhortMvnPath = process.env.VSCEXT_EXHORT_MVN_PATH || this.DEFAULT_MVN_EXECUTABLE;
        this.exhortGradlePath = process.env.VSCEXT_EXHORT_GRADLE_PATH || this.DEFAULT_GRADLE_EXECUTABLE;
        this.exhortNpmPath = process.env.VSCEXT_EXHORT_NPM_PATH || this.DEFAULT_NPM_EXECUTABLE;
        this.exhortGoPath = process.env.VSCEXT_EXHORT_GO_PATH || this.DEFAULT_GO_EXECUTABLE;
        this.exhortPython3Path = process.env.VSCEXT_EXHORT_PYTHON3_PATH || this.DEFAULT_PYTHON3_EXECUTABLE;
        this.exhortPip3Path = process.env.VSCEXT_EXHORT_PIP3_PATH || this.DEFAULT_PIP3_EXECUTABLE;
        this.exhortPythonPath = process.env.VSCEXT_EXHORT_PYTHON_PATH || this.DEFAULT_PYTHON_EXECUTABLE;
        this.exhortPipPath = process.env.VSCEXT_EXHORT_PIP_PATH || this.DEFAULT_PIP_EXECUTABLE;
        this.exhortSyftPath = process.env.VSCEXT_EXHORT_SYFT_PATH || this.DEFAULT_SYFT_EXECUTABLE;
        this.exhortSyftConfigPath = process.env.VSCEXT_EXHORT_SYFT_CONFIG_PATH || '';
        this.exhortSkopeoPath = process.env.VSCEXT_EXHORT_SKOPEO_PATH || this.DEFAULT_SKOPEO_EXECUTABLE;
        this.exhortSkopeoConfigPath = process.env.VSCEXT_EXHORT_SKOPEO_CONFIG_PATH || '';
        this.exhortDockerPath = process.env.VSCEXT_EXHORT_DOCKER_PATH || this.DEFAULT_DOCKER_EXECUTABLE;
        this.exhortPodmanPath = process.env.VSCEXT_EXHORT_PODMAN_PATH || this.DEFAULT_PODMAN_EXECUTABLE;
        this.exhortImagePlatform = process.env.VSCEXT_EXHORT_IMAGE_PLATFORM || '';
    }

    /**
     * Updates the global configuration with provided data from extension workspace settings.
     * @param data - The data from extension workspace settings to update the global configuration with.
     */
    updateConfig( rhdaConfig: any ) {
        this.matchManifestVersions = rhdaConfig.matchManifestVersions ? 'true' : 'false';
        this.usePythonVirtualEnvironment = rhdaConfig.usePythonVirtualEnvironment ? 'true' : 'false';
        this.useGoMVS = rhdaConfig.useGoMVS ? 'true' : 'false';
        this.enablePythonBestEffortsInstallation = rhdaConfig.enablePythonBestEffortsInstallation ? 'true' : 'false';
        this.usePipDepTree = rhdaConfig.usePipDepTree ? 'true' : 'false';
        this.vulnerabilityAlertSeverity = rhdaConfig.vulnerabilityAlertSeverity;
        this.exhortMvnPath = rhdaConfig.mvn.executable.path || this.DEFAULT_MVN_EXECUTABLE;
        this.exhortGradlePath = rhdaConfig.gradle.executable.path || this.DEFAULT_GRADLE_EXECUTABLE;
        this.exhortNpmPath = rhdaConfig.npm.executable.path || this.DEFAULT_NPM_EXECUTABLE;
        this.exhortGoPath = rhdaConfig.go.executable.path || this.DEFAULT_GO_EXECUTABLE;
        this.exhortPython3Path = rhdaConfig.python3.executable.path || this.DEFAULT_PYTHON3_EXECUTABLE;
        this.exhortPip3Path = rhdaConfig.pip3.executable.path || this.DEFAULT_PIP3_EXECUTABLE;
        this.exhortPythonPath = rhdaConfig.python.executable.path || this.DEFAULT_PYTHON_EXECUTABLE;
        this.exhortPipPath = rhdaConfig.pip.executable.path || this.DEFAULT_PIP_EXECUTABLE;
        this.exhortSyftPath = rhdaConfig.syft.executable.path || this.DEFAULT_SYFT_EXECUTABLE;
        this.exhortSyftConfigPath = rhdaConfig.syft.config.path;
        this.exhortSkopeoPath = rhdaConfig.skopeo.executable.path || this.DEFAULT_SKOPEO_EXECUTABLE;
        this.exhortSkopeoConfigPath = rhdaConfig.skopeo.config.path;
        this.exhortDockerPath = rhdaConfig.docker.executable.path || this.DEFAULT_DOCKER_EXECUTABLE;
        this.exhortPodmanPath = rhdaConfig.podman.executable.path || this.DEFAULT_PODMAN_EXECUTABLE;
        this.exhortImagePlatform = rhdaConfig.imagePlatform;
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
