/* --------------------------------------------------------------------------------------------
 * Copyright (c) Dharmendra Patel 2020
 * Licensed under the Apache-2.0 License. See License.txt in the project root for 
 * license information.
 * ------------------------------------------------------------------------------------------ */
'use strict';

class Config
{
    exhort_snyk_token:        string;
    server_url:               string;
    api_token:                string;
    three_scale_user_token:   string;
    provide_fullstack_action: boolean;
    forbidden_licenses:       Array<string>;
    no_crypto:                boolean;
    home_dir:                 string;
    uuid:                     string;
    golang_executable:        string;
    utm_source:               string;
    telemetry_id:             string;
    mvn_executable:           string;

    constructor() {
        // TODO: this needs to be configurable
        this.exhort_snyk_token = process.env.EXHORT_SNYK_TOKEN || '';
        this.server_url = process.env.RECOMMENDER_API_URL || 'api-url-not-available-in-lsp';
        this.api_token = process.env.RECOMMENDER_API_TOKEN || 'token-not-available-in-lsp';
        this.three_scale_user_token = process.env.THREE_SCALE_USER_TOKEN || '';
        this.provide_fullstack_action = (process.env.PROVIDE_FULLSTACK_ACTION || '') === 'true';
        this.forbidden_licenses = [];
        this.no_crypto = false;
        this.home_dir = process.env[(process.platform === 'win32') ? 'USERPROFILE' : 'HOME'];
        this.uuid = process.env.UUID || '';
        this.golang_executable = process.env.GOLANG_EXECUTABLE || 'go';
        this.utm_source = process.env.UTM_SOURCE || '';
        this.telemetry_id = process.env.TELEMETRY_ID || '';
        this.mvn_executable = process.env.MVN_EXECUTABLE || 'mvn';
    }
}

const config = new Config();

export { config };
