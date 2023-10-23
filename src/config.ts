/* --------------------------------------------------------------------------------------------
 * Copyright (c) Red Hat
 * Licensed under the Apache-2.0 License. See License.txt in the project root for 
 * license information.
 * ------------------------------------------------------------------------------------------ */
'use strict';

class Config
{
    exhortSnykToken:        string;
    matchManifestVersions:  boolean;
    provideFullstackAction: boolean;
    utmSource:               string;
    mvnExecutable:           string;
    npmExecutable:           string;
    goExecutable:            string;
    python3Executable:       string;
    pip3Executable:          string;
    pythonExecutable:        string;
    pipExecutable:           string;
    exhortDevMode:          string;
    telemetryId:             string;

    constructor() {
        // TODO: this needs to be configurable
        this.exhortSnykToken = process.env.SNYK_TOKEN || '';
        this.matchManifestVersions = (process.env.MATCH_MANIFEST_VERSIONS || '') === 'true';
        this.provideFullstackAction = (process.env.PROVIDE_FULLSTACK_ACTION || '') === 'true';
        this.utmSource = process.env.UTM_SOURCE || '';
        this.mvnExecutable = process.env.MVN_EXECUTABLE || 'mvn';
        this.npmExecutable = process.env.NPM_EXECUTABLE || 'npm';
        this.goExecutable = process.env.GO_EXECUTABLE || 'go';
        this.python3Executable = process.env.PYTHON3_EXECUTABLE || 'python3';
        this.pip3Executable = process.env.PIP3_EXECUTABLE || 'pip3';
        this.pythonExecutable = process.env.PYTHON_EXECUTABLE || 'python';
        this.pipExecutable = process.env.PIP_EXECUTABLE || 'pip';
        this.exhortDevMode = process.env.EXHORT_DEV_MODE || 'false';
        this.telemetryId = process.env.TELEMETRY_ID || '';
    }
}

const config = new Config();

export { config };
