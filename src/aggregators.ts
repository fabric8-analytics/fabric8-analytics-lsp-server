/* --------------------------------------------------------------------------------------------
 * Copyright (c) Red Hat, Dharmendra Patel 2020
 * Licensed under the Apache-2.0 License. See License.txt in the project root for license information.
 * ------------------------------------------------------------------------------------------ */
'use strict';
import { Vulnerability } from './vulnerability';

/* VulnerabilityAggregator */
interface VulnerabilityAggregator {
    isNewVulnerability: boolean;
    aggregate(newVulnerability: Vulnerability): Vulnerability;
}

/* Noop Vulnerability aggregator class */
class NoopVulnerabilityAggregator implements VulnerabilityAggregator {
    isNewVulnerability: boolean;

    aggregate(newVulnerability: Vulnerability): Vulnerability {
        // Make it a new vulnerability always and set ecosystem for vulnerability.
        this.isNewVulnerability = true;
        newVulnerability.ecosystem = newVulnerability.ref.split(':')[1].split('/')[0];

        return newVulnerability;
    }
}

/* Maven Vulnerability aggregator class */
class MavenVulnerabilityAggregator implements VulnerabilityAggregator {
    isNewVulnerability: boolean;
    vulnerabilities: Map<string, Vulnerability> = new Map<string, Vulnerability>();

    aggregate(newVulnerability: Vulnerability): Vulnerability {
        // Make it a new vulnerability always and set ecosystem for vulnerability.
        this.isNewVulnerability = true;
        const key = `${newVulnerability.ref}@${newVulnerability.range.start.line}`;
        const v = this.vulnerabilities.get(key);
        if (v) {
            this.isNewVulnerability = false;
            return v;
        }
        newVulnerability.ecosystem = 'maven';
        this.vulnerabilities.set(key, newVulnerability);
        return newVulnerability;
    }
}

export { VulnerabilityAggregator, NoopVulnerabilityAggregator, MavenVulnerabilityAggregator };
