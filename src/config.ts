/* --------------------------------------------------------------------------------------------
 * Copyright (c) Red Hat
 * Licensed under the Apache-2.0 License. See License.txt in the project root for 
 * license information.
 * ------------------------------------------------------------------------------------------ */
'use strict';

class Config
{
    exhort_snyk_token:        string;
    provide_fullstack_action: boolean;
    forbidden_licenses:       Array<string>;
    no_crypto:                boolean;
    home_dir:                 string;
    utm_source:               string;
    mvn_executable:           string;
    npm_executable:           string;
    exhort_dev_mode:          string;

    constructor() {
        // TODO: this needs to be configurable
        this.exhort_snyk_token = process.env.SNYK_TOKEN || '';
        this.provide_fullstack_action = (process.env.PROVIDE_FULLSTACK_ACTION || '') === 'true';
        this.forbidden_licenses = [];
        this.no_crypto = false;
        this.home_dir = process.env[(process.platform === 'win32') ? 'USERPROFILE' : 'HOME'];
        this.utm_source = process.env.UTM_SOURCE || '';
        this.mvn_executable = process.env.MVN_EXECUTABLE || 'mvn';
        this.npm_executable = process.env.NPM_EXECUTABLE || 'npm';
        this.exhort_dev_mode = process.env.EXHORT_DEV_MODE || 'false';
    }
}

const config = new Config();

export { config };
