/* --------------------------------------------------------------------------------------------
 * Copyright (c) Red Hat, Dharmendra Patel 2020
 * Licensed under the Apache-2.0 License. See License.txt in the project root for license information.
 * ------------------------------------------------------------------------------------------ */
'use strict';
import { Vulnerability } from './vulnerability';
import compareVersions = require('compare-versions');

const severity = ["low", "medium", "high", "critical"];

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
        newVulnerability.ecosystem = "";

        return newVulnerability;
    }
}

/* Golang Vulnerability aggregator class */
class GolangVulnerabilityAggregator implements VulnerabilityAggregator {
    vulnerabilities: Array<Vulnerability> = Array<Vulnerability>();
    isNewVulnerability: boolean;

    aggregate(newVulnerability: Vulnerability): Vulnerability {
        // Set ecosystem for new vulnerability from aggregator
        newVulnerability.ecosystem = "golang";

        // Check if module / package exists in the list.
        this.isNewVulnerability = true;

        var existingVulnerabilityIndex = 0
        this.vulnerabilities.forEach((pckg, index) => {
            // Module and package can come in any order due to parallel batch requests.
            // Need handle use case (1) Module first followed by package and (2) Vulnerability first followed by module.
            if (newVulnerability.name.startsWith(pckg.name + "/") || pckg.name.startsWith(newVulnerability.name + "/")) {
                // Module / package exists, so aggregate the data and update Diagnostic message and code action.
                this.mergeVulnerability(index, newVulnerability);
                this.isNewVulnerability = false;
                existingVulnerabilityIndex = index;
            }
        });

        if (this.isNewVulnerability) {
            this.vulnerabilities.push(newVulnerability);
            return newVulnerability;
        }

        return this.vulnerabilities[existingVulnerabilityIndex];
    }

    private mergeVulnerability(existingIndex: number, newVulnerability: Vulnerability) {
        // Between current name and new name, smallest will be the module name.
        // So, assign the smallest as package name.
        if (newVulnerability.name.length < this.vulnerabilities[existingIndex].name.length)
            this.vulnerabilities[existingIndex].name = newVulnerability.name;

        // Merge other informations
        this.vulnerabilities[existingIndex].packageCount += newVulnerability.packageCount;
        this.vulnerabilities[existingIndex].vulnerabilityCount += newVulnerability.vulnerabilityCount;
        this.vulnerabilities[existingIndex].advisoryCount += newVulnerability.advisoryCount;
        this.vulnerabilities[existingIndex].exploitCount += newVulnerability.exploitCount;
        this.vulnerabilities[existingIndex].highestSeverity = this.getMaxSeverity(
            this.vulnerabilities[existingIndex].highestSeverity, newVulnerability.highestSeverity);
        this.vulnerabilities[existingIndex].recommendedVersion = this.getMaxRecVersion(
            this.vulnerabilities[existingIndex].recommendedVersion, newVulnerability.recommendedVersion);
    }

    private getMaxSeverity(oldSeverity: string, newSeverity: string): string {
        const newSeverityIndex = Math.max(severity.indexOf(oldSeverity), severity.indexOf(newSeverity));
        return severity[newSeverityIndex];
    }

    private getMaxRecVersion(oldRecVersion: string, newRecVersion: string): string {
        // Compute maximium recommended version.
        var maxRecVersion = oldRecVersion;
        if (oldRecVersion == "" || oldRecVersion == null) {
            maxRecVersion = newRecVersion;
        } else if (newRecVersion != "" && newRecVersion != null) {
            if (compareVersions(oldRecVersion, newRecVersion) == -1) {
                maxRecVersion = newRecVersion;
            }
        }

        return maxRecVersion;
    }
}

export { VulnerabilityAggregator, NoopVulnerabilityAggregator, GolangVulnerabilityAggregator };
