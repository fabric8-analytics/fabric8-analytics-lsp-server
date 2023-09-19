/* --------------------------------------------------------------------------------------------
 * Copyright (c) Red Hat
 * Licensed under the Apache-2.0 License. See License.txt in the project root for license information.
 * ------------------------------------------------------------------------------------------ */
'use strict';
import { IDependencyProvider } from './collector';
import { Vulnerability } from './vulnerability';

/* VulnerabilityAggregator */
interface VulnerabilityAggregator {
    isNewVulnerability: boolean;
    aggregate(newVulnerability: Vulnerability): Vulnerability;
}

/* Noop Vulnerability aggregator class */
class NoopVulnerabilityAggregator implements VulnerabilityAggregator {
    isNewVulnerability: boolean;
    provider: IDependencyProvider;
    constructor(provider: IDependencyProvider) {
        this.provider = provider;
    }

    aggregate(newVulnerability: Vulnerability): Vulnerability {
        // Make it a new vulnerability always and set ecosystem for vulnerability.
        this.isNewVulnerability = true;
        newVulnerability.provider = this.provider;

        return newVulnerability;
    }
}

/* Maven Vulnerability aggregator class */
class MavenVulnerabilityAggregator implements VulnerabilityAggregator {
    isNewVulnerability: boolean;
    vulnerabilities: Map<string, Vulnerability> = new Map<string, Vulnerability>();
    provider: IDependencyProvider;
    constructor(provider: IDependencyProvider) {
        this.provider = provider;
    }

    aggregate(newVulnerability: Vulnerability): Vulnerability {
        // Make it a new vulnerability always and set ecosystem for vulnerability.
        this.isNewVulnerability = true;
        const key = `${newVulnerability.ref}@${newVulnerability.range.start.line}`;
        const v = this.vulnerabilities.get(key);
        if (v) {
            this.isNewVulnerability = false;
            return v;
        }
        newVulnerability.provider = this.provider;
        this.vulnerabilities.set(key, newVulnerability);
        return newVulnerability;
    }
}

export { VulnerabilityAggregator, NoopVulnerabilityAggregator, MavenVulnerabilityAggregator };
