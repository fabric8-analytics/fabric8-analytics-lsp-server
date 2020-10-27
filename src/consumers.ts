/* --------------------------------------------------------------------------------------------
 * Copyright (c) Pavel Odvody 2016
 * Licensed under the Apache-2.0 License. See License.txt in the project root for license information.
 * ------------------------------------------------------------------------------------------ */
'use strict';
import { IDependency } from './collector';
import { get_range } from './utils';
import { Vulnerability } from './vulnerability';
import { VulnerabilityAggregator } from './aggregators';
import { Diagnostic, CodeAction, CodeActionKind } from 'vscode-languageserver'

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
    produce(): T;
};

/* Each pipeline item is defined as a single consumer and producer pair */
interface IPipelineItem<T> extends IConsumer, IProducer<T> { };

/* House bunches of `IPipelineItem`'s */
interface IPipeline<T> {
    items: Array<IPipelineItem<T>>;
    run(data: any): T;
};

/* Diagnostics producer type */
type DiagnosticProducer = IProducer<Vulnerability[]>;

/* Diagnostics pipeline implementation */
class DiagnosticsPipeline implements IPipeline<Vulnerability[]>
{
    items: Array<IPipelineItem<Vulnerability[]>>;
    dependency: IDependency;
    config: any;
    diagnostics: Array<Diagnostic>;
    uri: string;
    vulnerabilityAggregator: VulnerabilityAggregator;
    constructor(classes: Array<any>, dependency: IDependency, config: any, diags: Array<Diagnostic>,
        vulnerabilityAggregator: VulnerabilityAggregator, uri: string) {
        this.items = classes.map((i) => { return new i(dependency, config); });
        this.dependency = dependency;
        this.config = config;
        this.diagnostics = diags;
        this.uri = uri;
        this.vulnerabilityAggregator = vulnerabilityAggregator;
    }

    run(data: any): Vulnerability[] {
        for (let item of this.items) {
            if (item.consume(data)) {
                for (let d of item.produce()) {
                    const aggVulnerability = this.vulnerabilityAggregator.aggregate(d);
                    const aggDiagnostic = aggVulnerability.getDiagnostic();

                    // Add/Update quick action for given aggregated diangnostic
                    // TODO: this can be done lazily
                    if (aggVulnerability.recommendedVersion && (aggVulnerability.vulnerabilityCount > 0 || aggVulnerability.exploitCount != null)) {
                        let codeAction: CodeAction = {
                            title: `Switch to recommended version ${aggVulnerability.recommendedVersion}`,
                            diagnostics: [aggDiagnostic],
                            kind: CodeActionKind.QuickFix,  // Provide a QuickFix option if recommended version is available
                            edit: {
                                changes: {
                                }
                            }
                        };
                        codeAction.edit.changes[this.uri] = [{
                            range: aggDiagnostic.range,
                            newText: aggVulnerability.recommendedVersion
                        }];
                        // We will have line|start as key instead of message
                        codeActionsMap[aggDiagnostic.range.start.line + "|" + aggDiagnostic.range.start.character] = codeAction;
                    }

                    if (this.vulnerabilityAggregator.isNewVulnerability) {
                        this.diagnostics.push(aggDiagnostic);
                    } else {
                        // Update the existing diagnostic object based on range values
                        this.diagnostics.forEach((diag, index) => {
                            if (diag.range.start.line == aggVulnerability.range.start.line &&
                                diag.range.start.character == aggVulnerability.range.start.character) {
                                this.diagnostics[index] = aggDiagnostic;
                                return;
                            }
                        });
                    }
                }
            }
        }
        // This is not used by any one.
        return [];
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

    produce(): Vulnerability[] {
        if (this.item.length > 0) {
            return [new Vulnerability(this.package, this.version, 1,
                this.vulnerabilityCount, this.advisoryCount, this.exploitCount, this.highestSeverity,
                this.changeTo, get_range(this.context.version))];
        } else {
            return [];
        }
    }
};

let codeActionsMap = new Map<string, CodeAction>();

export { DiagnosticsPipeline, SecurityEngine, codeActionsMap };
