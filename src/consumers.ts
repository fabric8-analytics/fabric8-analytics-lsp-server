/* --------------------------------------------------------------------------------------------
 * Copyright (c) Pavel Odvody 2016
 * Licensed under the Apache-2.0 License. See License.txt in the project root for license information.
 * ------------------------------------------------------------------------------------------ */
'use strict';
import { IDependency } from './collector';
import { get_range } from './utils';
import { Diagnostic, DiagnosticSeverity, CodeAction, CodeActionKind } from 'vscode-languageserver'
import compareVersions = require('compare-versions');
import { Range } from 'vscode-languageserver';


/* Descriptor describing what key-path to extract from the document */
interface IBindingDescriptor {
    path: Array<string>;
};

/* Bind & return the part of `obj` as described by `desc` */
let bind_object = (obj: any, desc: IBindingDescriptor) => {
    let bind = obj;
    for (let elem of desc.path) {
        if (elem in bind) {
            bind = bind[elem];
        } else {
            return null;
        }
    }
    return bind;
};

/* Arbitrary metadata consumer interface */
interface IConsumer {
    binding: IBindingDescriptor;
    item: any;
    consume(data: any): boolean;
};

/* Generic `T` producer */
interface IProducer<T> {
    produce(ctx: any, cls: DiagnosticsPipeline): T;
};

/* Each pipeline item is defined as a single consumer and producer pair */
interface IPipelineItem<T> extends IConsumer, IProducer<T> { };

/* House bunches of `IPipelineItem`'s */
interface IPipeline<T> {
    items: Array<IPipelineItem<T>>;
    run(data: any): T;
};

/* Diagnostics producer type */
type DiagnosticProducer = IProducer<Diagnostic[]>;

/* Package vulnerability data */
class Package
{
    name: string;
    version: string;
    packageCount: number;
    vulnerabilityCount: number;
    advisoryCount: number;
    exploitCount: number;
    highestSeverity: string;
    recommendedVersion: string;
    range: Range;

    constructor(
        name: string, version: string, packageCount: number,
        vulnerabilityCount: number, advisoryCount: number,
        exploitCount: number, highestSeverity: string,
        recommendedVersion: string, range: Range) {
            this.name = name;
            this.version = version;
            this.packageCount = packageCount || 0;
            this.vulnerabilityCount = vulnerabilityCount || 0;
            this.advisoryCount = advisoryCount || 0;
            this.exploitCount = exploitCount || 0;
            this.highestSeverity = highestSeverity;
            this.recommendedVersion = recommendedVersion;
            this.range = range
    }

    getDiagnostic(): Diagnostic {
        /* The diagnostic's severity. */
        let diagSeverity: any;

        if (this.vulnerabilityCount == 0 && this.advisoryCount > 0) {
            diagSeverity = DiagnosticSeverity.Information;
        } else {
            diagSeverity = DiagnosticSeverity.Error;
        }

        const recommendedVersion = this.recommendedVersion || "N/A";
        const exploitCount = this.exploitCount || "unavailable";
        const msg = `${this.name}: ${this.version}
Number of packages: ${this.packageCount}
Known security vulnerability: ${this.vulnerabilityCount}
Security advisory: ${this.advisoryCount}
Exploits: ${exploitCount}
Highest severity: ${this.highestSeverity}
Recommendation: ${recommendedVersion}`;

        return {
            severity: diagSeverity,
            range: this.range,
            message: msg,
            source: '\nDependency Analytics Plugin [Powered by Snyk]',
        };
    }
}

/* Package aggregator class */
class PackageAggregator
{
    packages: Array<Package> = Array<Package>()
    isNewPackage: boolean

    aggregate(newPackage: Package): Package {
        // Check if module / package exists in the list.
        this.isNewPackage = true

        for (let i = 0; i < this.packages.length; i++) {
            // Module and package can come in any order due to parallel batch requests.
            // Need handle use case (1) Module first followed by package and (2) Package first followed by module.
            if (newPackage.name.startsWith(this.packages[i].name + "/") || this.packages[i].name.startsWith(newPackage.name + "/")) {
                // Module / package exists, so aggregate the data and update Diagnostic message and code action.
                this.mergePackage(i, newPackage)
                this.isNewPackage = false
                return this.packages[i]
            }
        }

        if (this.isNewPackage) {
            this.packages.push(newPackage)
        }

        return newPackage
    }

    private mergePackage(exitingIndex: number, newPackage: Package) {
        // Between current name and new name, smallest will be the module name.
        // So, assign the smallest as package name.
        if (newPackage.name.length < this.packages[exitingIndex].name.length)
            this.packages[exitingIndex].name = newPackage.name

        // Merge other informations
        this.packages[exitingIndex].packageCount += newPackage.packageCount
        this.packages[exitingIndex].vulnerabilityCount += newPackage.vulnerabilityCount
        this.packages[exitingIndex].advisoryCount += newPackage.advisoryCount
        this.packages[exitingIndex].exploitCount += newPackage.exploitCount
        this.packages[exitingIndex].highestSeverity = this.getAggregatedSeverity(
            this.packages[exitingIndex].highestSeverity, newPackage.highestSeverity)
        this.packages[exitingIndex].recommendedVersion = this.getMaxRecVersion(
            this.packages[exitingIndex].recommendedVersion, newPackage.recommendedVersion)
    }

    private getAggregatedSeverity(oldSeverity: string, newSeverity: string): string {
        // Compute highest severity
        var maxSeverity = oldSeverity
        if (oldSeverity == "critical" || newSeverity == "critical")
            maxSeverity = "critical"
        else if (oldSeverity == "high" || newSeverity == "high")
            maxSeverity = "high"
        else if (oldSeverity == "medium" || newSeverity == "medium")
            maxSeverity = "medium"
        else if (oldSeverity == "low" || newSeverity == "low")
            maxSeverity = "low"

        return maxSeverity
    }

    private getMaxRecVersion(oldRecVersion: string, newRecVersion: string): string {
        // Compute maximium recommended version.
        var maxRecVersion = oldRecVersion;
        if (oldRecVersion == "") {
            maxRecVersion = newRecVersion;
        } else if (newRecVersion != "") {
            if (compareVersions(oldRecVersion, newRecVersion) == -1) {
                maxRecVersion = newRecVersion
            }
        }

        return maxRecVersion
    }
}

/* Diagnostics pipeline implementation */
class DiagnosticsPipeline implements IPipeline<Diagnostic[]>
{
    items: Array<IPipelineItem<Diagnostic[]>>;
    dependency: IDependency;
    config: any;
    diagnostics: Array<Diagnostic>;
    uri: string;
    packageAggregator: PackageAggregator;
    constructor(classes: Array<any>, dependency: IDependency, config: any, diags: Array<Diagnostic>,
        packageAggregator: PackageAggregator, uri: string) {
        this.items = classes.map((i) => { return new i(dependency, config); });
        this.dependency = dependency;
        this.config = config;
        this.diagnostics = diags;
        this.uri = uri;
        this.packageAggregator = packageAggregator
    }

    run(data: any): Diagnostic[] {
        for (let item of this.items) {
            if (item.consume(data)) {
                for (let d of item.produce(this.uri, this))
                    this.diagnostics.push(d);
            }
        }
        return this.diagnostics;
    }
};

/* A consumer that uses the binding interface to consume a metadata object */
class AnalysisConsumer implements IConsumer {
    binding: IBindingDescriptor;
    packageBinding: IBindingDescriptor;
    versionBinding: IBindingDescriptor;
    changeToBinding: IBindingDescriptor;
    messageBinding: IBindingDescriptor;
    vulnerabilityCountBinding: IBindingDescriptor;
    advisoryCountBinding: IBindingDescriptor;
    exploitCountBinding: IBindingDescriptor;
    highestSeverityBinding: IBindingDescriptor;
    item: any;
    package: string = null;
    version: string = null;
    changeTo: string = null;
    message: string = null;
    vulnerabilityCount: number = 0;
    advisoryCount: number = 0;
    exploitCount: number | null;
    highestSeverity: string = null;
    constructor(public config: any) { }
    consume(data: any): boolean {
        if (this.binding != null) {
            this.item = bind_object(data, this.binding);
        } else {
            this.item = data;
        }
        if (this.packageBinding != null) {
            this.package = bind_object(data, this.packageBinding);
        }
        if (this.versionBinding != null) {
            this.version = bind_object(data, this.versionBinding);
        }
        if (this.changeToBinding != null) {
            this.changeTo = bind_object(data, this.changeToBinding);
        }
        if (this.messageBinding != null) {
            this.message = bind_object(data, this.messageBinding);
        }
        if (this.vulnerabilityCountBinding != null) {
            this.vulnerabilityCount = bind_object(data, this.vulnerabilityCountBinding);
        }
        if (this.advisoryCountBinding != null) {
            this.advisoryCount = bind_object(data, this.advisoryCountBinding);
        }
        if (this.exploitCountBinding != null) {
            this.exploitCount = bind_object(data, this.exploitCountBinding);
        }
        if (this.highestSeverityBinding != null) {
            this.highestSeverity = bind_object(data, this.highestSeverityBinding);
        }
        return this.item != null;
    }
};

/* We've received an empty/unfinished result, display that analysis is pending */
class EmptyResultEngine extends AnalysisConsumer implements DiagnosticProducer {
    constructor(public context: IDependency, config: any) {
        super(config);
    }

    produce(): Diagnostic[] {
        if (this.item == {} && (this.item.finished_at === undefined ||
            this.item.finished_at == null)) {
            return [{
                severity: DiagnosticSeverity.Information,
                range: get_range(this.context.version),
                message: `Application dependency ${this.context.name.value}-${this.context.version.value} - analysis is pending`,
                source: 'Dependency Analytics Plugin [Powered by Snyk]'
            }]
        } else {
            return [];
        }
    }
}

/* Report CVEs in found dependencies */
class SecurityEngine extends AnalysisConsumer implements DiagnosticProducer {
    constructor(public context: IDependency, config: any) {
        super(config);
        this.binding = { path: ['vulnerability'] };
        this.packageBinding = { path: ['package'] };
        this.versionBinding = { path: ['version'] };
        /* recommendation to use a different version */
        this.changeToBinding = { path: ['recommended_versions'] };
        /* Diagnostic message */
        this.messageBinding = { path: ['message'] };
        /* Publicly known Security Vulnerability count */
        this.vulnerabilityCountBinding = { path: ['known_security_vulnerability_count'] };
        /* Private Security Advisory count */
        this.advisoryCountBinding = { path: ['security_advisory_count'] };
        /* Exloitable vulnerability count */
        this.exploitCountBinding = { path: ['exploitable_vulnerabilities_count'] };
        /* Highest Severity */
        this.highestSeverityBinding = { path: ['highest_severity'] };
    }

    produce(ctx: any, cls: DiagnosticsPipeline): Diagnostic[] {
        if (this.item.length > 0) {
            const aggPackage = cls.packageAggregator.aggregate(new Package(this.package, this.version, 1,
                this.vulnerabilityCount, this.advisoryCount, this.exploitCount, this.highestSeverity,
                this.changeTo, get_range(this.context.version)))
            const aggDiagnostic = aggPackage.getDiagnostic()
            
            // Add/Update quick action for given aggregated diangnostic
            // TODO: this can be done lazily
            if (aggPackage.recommendedVersion && (aggPackage.vulnerabilityCount > 0 || aggPackage.exploitCount != null)) {
                let codeAction: CodeAction = {
                    title: `Switch to recommended version ${aggPackage.recommendedVersion}`,
                    diagnostics: [aggDiagnostic],
                    kind: CodeActionKind.QuickFix,  // Provide a QuickFix option if recommended version is available
                    edit: {
                        changes: {
                        }
                    }
                };
                codeAction.edit.changes[ctx] = [{
                    range: aggDiagnostic.range,
                    newText: aggPackage.recommendedVersion
                }];
                // We will have line|start as key instead of message
                codeActionsMap[aggDiagnostic.range.start.line + "|" + aggDiagnostic.range.start.character] = codeAction
            }

            if (cls.packageAggregator.isNewPackage)
                return [aggDiagnostic];
            else {
                // Update the existing diagnostic object based on range values
                for (let i = 0; i < cls.diagnostics.length; i++) {
                    if (cls.diagnostics[i].range.start.line == aggPackage.range.start.line &&
                        cls.diagnostics[i].range.start.character == aggPackage.range.start.character) {
                        cls.diagnostics[i] = aggDiagnostic;
                        break;
                    }
                }

                return [];
            }
        } else {
            return [];
        }
    }
};

let codeActionsMap = new Map<string, CodeAction>();

export { DiagnosticsPipeline, SecurityEngine, EmptyResultEngine, PackageAggregator, codeActionsMap };
