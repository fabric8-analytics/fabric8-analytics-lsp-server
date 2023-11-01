/* --------------------------------------------------------------------------------------------
 * Copyright (c) Red Hat
 * Licensed under the Apache-2.0 License. See License.txt in the project root for 
 * license information.
 * ------------------------------------------------------------------------------------------ */
'use strict';

class Config
{
    provideFullstackAction:  boolean;
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
        this.provideFullstackAction = (process.env.VSCEXT_PROVIDE_FULLSTACK_ACTION || '') === 'true';
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
}

const config = new Config();

export { config };
