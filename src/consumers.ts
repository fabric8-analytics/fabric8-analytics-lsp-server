/* --------------------------------------------------------------------------------------------
 * Copyright (c) Pavel Odvody 2016
 * Licensed under the Apache-2.0 License. See License.txt in the project root for license information.
 * ------------------------------------------------------------------------------------------ */
'use strict';
import { IDependency } from './collector';
import { get_range } from './utils';
import { Diagnostic, DiagnosticSeverity, CodeAction, CodeActionKind } from 'vscode-languageserver'
import compareVersions = require('compare-versions');

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

/* Diagnostics pipeline implementation */
class DiagnosticsPipeline implements IPipeline<Diagnostic[]>
{
    items: Array<IPipelineItem<Diagnostic[]>>;
    dependency: IDependency;
    config: any;
    diagnostics: Array<Diagnostic>;
    uri: string;
    constructor(classes: Array<any>, dependency: IDependency, config: any, diags: Array<Diagnostic>, uri: string) {
        this.items = classes.map((i) => { return new i(dependency, config); });
        this.dependency = dependency;
        this.config = config;
        this.diagnostics = diags;
        this.uri = uri;
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

    private getAggregaterExploitCount(oldExploitCount: string): string {
        // Compute sum of exploits, taking 'unavailable' value for exploit.
        var newExploitCount: any
        if (oldExploitCount == "unavailable") {
            newExploitCount = this.exploitCount || "unavailable";
        } else {
            newExploitCount = parseInt(oldExploitCount) + this.exploitCount
        }

        return newExploitCount.toString()
    }

    private getAggregatedSeverity(oldSeverity: string): string {
        // Compute highest severity
        var newSeverity = oldSeverity
        if (this.highestSeverity == "critical" || oldSeverity == "critical")
            newSeverity = "critical"
        else if (this.highestSeverity == "high" || oldSeverity == "high")
            newSeverity = "high"
        else if (this.highestSeverity == "medium" || oldSeverity == "medium")
            newSeverity = "medium"
        else if (this.highestSeverity == "low" || oldSeverity == "low")
            newSeverity = "low"

        return newSeverity
    }

    private getMaxRecVersion(oldRecVersion: string): string {
        var newRecVersion = oldRecVersion;

        // Compute rec version based on max criteria
        var newRecVersion = oldRecVersion
        if (oldRecVersion == "N/A") {
            newRecVersion = this.changeTo || "N/A";
        } else if (this.changeTo) {
            if (compareVersions(oldRecVersion, this.changeTo) == -1) {
                newRecVersion = this.changeTo
            }
        }

        return newRecVersion
    }

    produce(ctx: any, cls: DiagnosticsPipeline): Diagnostic[] {
        if (this.item.length > 0) {
            /* The diagnostic's severity. */
            let diagSeverity;

            if (this.vulnerabilityCount == 0 && this.advisoryCount > 0) {
                diagSeverity = DiagnosticSeverity.Information;
            } else {
                diagSeverity = DiagnosticSeverity.Error;
            }
            
            const recommendedVersion = this.changeTo || "N/A";
            const exploitCount = this.exploitCount || "unavailable";
            const msg = `${this.package}: ${this.version}
Number of packages: 1
Known security vulnerability: ${this.vulnerabilityCount}
Security advisory: ${this.advisoryCount}
Exploits: ${exploitCount}
Highest severity: ${this.highestSeverity}
Recommendation: ${recommendedVersion}`;
            let diagnostic = {
                severity: diagSeverity,
                range: get_range(this.context.version),
                message: msg,
                source: '\nDependency Analytics Plugin [Powered by Snyk]',
            };

            let diagnosticLinePresent = false
            let diagnosticIndex = 0
            for (let i = 0; i < cls.diagnostics.length; i++) {
                if (cls.diagnostics[i].range.start.line.toString() == diagnostic.range.start.line.toString()) {
                    diagnosticLinePresent = true
                    diagnosticIndex = i
                }
            }

            if (diagnosticLinePresent) {
                // Add new counts to old one
                const oldMessage = cls.diagnostics[diagnosticIndex].message.split("\n")
                const packageCount = parseInt(oldMessage[1].split(":")[1].trim()) + 1
                const securityVulnerabilityCount = parseInt(oldMessage[2].split(":")[1].trim()) + this.vulnerabilityCount
                const securityAdvisoryCount = parseInt(oldMessage[3].split(":")[1].trim()) + this.advisoryCount
                const newExploitCount = this.getAggregaterExploitCount(oldMessage[4].split(":")[1].trim())
                const newSeverity = this.getAggregatedSeverity(oldMessage[5].split(":")[1].trim())
                const newRecVersion = this.getMaxRecVersion(oldMessage[6].split(":")[1].trim())
            
                const newPackageMessage = `${oldMessage[0].trim()}
Number of packages: ${packageCount}
Known security vulnerability: ${securityVulnerabilityCount}
Security advisory: ${securityAdvisoryCount}
Exploits: ${newExploitCount}
Highest severity: ${newSeverity}
Recommendation: ${newRecVersion}`;
                cls.diagnostics[diagnosticIndex].message = newPackageMessage
            }

            // Add quick action if not present for this range
            // TODO: this can be done lazily
            if (!diagnosticLinePresent && this.changeTo && (this.vulnerabilityCount > 0 || this.exploitCount != null)) {
                let codeAction: CodeAction = {
                    title: "Switch to recommended version " + this.changeTo,
                    diagnostics: [diagnostic],
                    kind: CodeActionKind.QuickFix,  // Provide a QuickFix option if recommended version is available
                    edit: {
                        changes: {
                        }
                    }
                };
                codeAction.edit.changes[ctx] = [{
                    range: diagnostic.range,
                    newText: this.changeTo
                }];
                // We will have line|start as key instead of message
                codeActionsMap[diagnostic.range.start.line + "|" + diagnostic.range.start.character] = codeAction
            }

            if (!diagnosticLinePresent)
                return [diagnostic]
            else
                return []
        } else {
            return [];
        }
    }
};

let codeActionsMap = new Map<string, CodeAction>();

export { DiagnosticsPipeline, SecurityEngine, EmptyResultEngine, codeActionsMap };
