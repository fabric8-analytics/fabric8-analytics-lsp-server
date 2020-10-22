/* --------------------------------------------------------------------------------------------
 * Copyright (c) Red Hat, Dharmendra Patel 2020
 * Licensed under the Apache-2.0 License. See License.txt in the project root for license information.
 * ------------------------------------------------------------------------------------------ */
'use strict';
import { Package } from './package';
import compareVersions = require('compare-versions');

/* PackageAggregator */
class PackageAggregator {
    ecosystem: string;
    packages: Array<Package> = Array<Package>();
    isNewPackage: boolean;

    constructor(ecosystem: string) {
        this.ecosystem = ecosystem;
    }

    aggregate(newPackage: Package): Package {
        return null;
    }
}

/* Noop Package aggregator class */
class NoopPackageAggregator extends PackageAggregator {
    constructor() {
        super("");
    }

    aggregate(newPackage: Package): Package {
        // Make it a new package always and set ecosystem for package.
        this.isNewPackage = true;
        newPackage.ecosystem = this.ecosystem;

        return newPackage;
    }
}

/* Golang Package aggregator class */
class GolangPackageAggregator extends PackageAggregator {
    constructor() {
        super("golang");
    }

    aggregate(newPackage: Package): Package {
        // Set ecosystem for new package from aggregator
        newPackage.ecosystem = this.ecosystem;

        // Check if module / package exists in the list.
        this.isNewPackage = true;

        var existingPackageIndex = 0
        this.packages.forEach((pckg, index) => {
            // Module and package can come in any order due to parallel batch requests.
            // Need handle use case (1) Module first followed by package and (2) Package first followed by module.
            if (newPackage.name.startsWith(pckg.name + "/") || pckg.name.startsWith(newPackage.name + "/")) {
                // Module / package exists, so aggregate the data and update Diagnostic message and code action.
                this.mergePackage(index, newPackage);
                this.isNewPackage = false;
                existingPackageIndex = index;
            }
        });

        if (this.isNewPackage) {
            this.packages.push(newPackage);
            return newPackage;
        }

        return this.packages[existingPackageIndex];
    }

    private mergePackage(existingIndex: number, newPackage: Package) {
        // Between current name and new name, smallest will be the module name.
        // So, assign the smallest as package name.
        if (newPackage.name.length < this.packages[existingIndex].name.length)
            this.packages[existingIndex].name = newPackage.name;

        // Merge other informations
        this.packages[existingIndex].packageCount += newPackage.packageCount;
        this.packages[existingIndex].vulnerabilityCount += newPackage.vulnerabilityCount;
        this.packages[existingIndex].advisoryCount += newPackage.advisoryCount;
        this.packages[existingIndex].exploitCount += newPackage.exploitCount;
        this.packages[existingIndex].highestSeverity = this.getMaxSeverity(
            this.packages[existingIndex].highestSeverity, newPackage.highestSeverity);
        this.packages[existingIndex].recommendedVersion = this.getMaxRecVersion(
            this.packages[existingIndex].recommendedVersion, newPackage.recommendedVersion);
    }

    private getMaxSeverity(oldSeverity: string, newSeverity: string): string {
        const severity = ["low", "medium", "high", "critical"];
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

export { PackageAggregator, NoopPackageAggregator, GolangPackageAggregator };
