/* --------------------------------------------------------------------------------------------
 * Copyright (c) Pavel Odvody 2016
 * Licensed under the Apache-2.0 License. See License.txt in the project root for license information.
 * ------------------------------------------------------------------------------------------ */
'use strict';
import { IDependency } from './collector';
import { get_range, VERSION_TEMPLATE } from './utils';
import { Vulnerability } from './vulnerability';
import { VulnerabilityAggregator } from './aggregators';
import { Diagnostic, CodeAction, CodeActionKind } from 'vscode-languageserver';

/* Descriptor describing what key-path to extract from the document */
interface IBindingDescriptor {
    path: Array<string>;
}

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
}

/* Generic `T` producer */
interface IProducer<T> {
    produce(): T;
}

/* Each pipeline item is defined as a single consumer and producer pair */
interface IPipelineItem<T> extends IConsumer, IProducer<T> { }

/* House bunches of `IPipelineItem`'s */
interface IPipeline<T> {
    items: Array<IPipelineItem<T>>;
    run(data: any): T;
}

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
                for (let vulnerability of item.produce()) {
                    const aggVulnerability = this.vulnerabilityAggregator.aggregate(vulnerability);
                    const aggDiagnostic = aggVulnerability.getDiagnostic();
                    
                    if (aggVulnerability.recommendation !== null && aggVulnerability.issuesCount === 0) {
                        let codeAction: CodeAction = {
                            title: `Switch to version ${aggVulnerability.recommendationVersion}`,
                            diagnostics: [aggDiagnostic],
                            kind: CodeActionKind.QuickFix,  // Provide a QuickFix option if recommended version is available
                            edit: {
                                changes: {
                                }
                            }
                        };
                        codeAction.edit.changes[this.uri] = [{
                            range: aggDiagnostic.range,
                            newText: vulnerability.replacement.replace(VERSION_TEMPLATE, aggVulnerability.recommendationVersion)
                        }];
                        // We will have line|start as key instead of message
                        codeActionsMap[aggDiagnostic.range.start.line + '|' + aggDiagnostic.range.start.character] = codeAction;
                    }
                    if (Object.keys(aggVulnerability.remediations).length > 0 && aggVulnerability.issuesCount > 0) {
                        for (const cve of Object.keys(aggVulnerability.remediations)) {
                            let version = aggVulnerability.remediations[cve]['mavenPackage'].split('@')[1];
                            let codeAction: CodeAction = {
                                title: `Switch to version ${version} for ${cve}`,
                                diagnostics: [aggDiagnostic],
                                kind: CodeActionKind.QuickFix,  // Provide a QuickFix option if recommended version is available
                                edit: {
                                    changes: {
                                    }
                                }
                            };
                            codeAction.edit.changes[this.uri] = [{
                                range: aggDiagnostic.range,
                                newText: vulnerability.replacement.replace(VERSION_TEMPLATE, version)
                            }];
                            // We will have line|start as key instead of message
                            codeActionsMap[aggDiagnostic.range.start.line + '|' + aggDiagnostic.range.start.character] = codeAction;
                        }
                    }

                    if (this.vulnerabilityAggregator.isNewVulnerability) {
                        this.diagnostics.push(aggDiagnostic);
                    } else {
                        // Update the existing diagnostic object based on range values
                        this.diagnostics.forEach((diag, index) => {
                            if (diag.range.start.line === aggVulnerability.range.start.line &&
                                diag.range.start.character === aggVulnerability.range.start.character) {
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
}

/* A consumer that uses the binding interface to consume a metadata object */
class AnalysisConsumer implements IConsumer {
    item: any;
    binding: IBindingDescriptor;
    refBinding: IBindingDescriptor;
    recommendationBinding: IBindingDescriptor;
    recommendationNameBinding: IBindingDescriptor;
    recommendationVersionBinding: IBindingDescriptor;
    remediationsBinding: IBindingDescriptor;
    highestVulnerabilityBinding: IBindingDescriptor;
    highestVulnerabilitySeverityBinding: IBindingDescriptor;
    issuesCount: number = 0;
    ref: string = null;
    recommendation: any = null;
    recommendationName: string = null;
    recommendationVersion: string = null;
    remediations: any = null;
    highestVulnerability: any = null;
    highestVulnerabilitySeverity: string = null;
    constructor(public config: any) { }
    consume(data: any): boolean {
        if (this.binding !== null) {
            this.item = bind_object(data, this.binding);
            this.issuesCount = this.item !== null ? this.item.length : 0;
        }
        if (this.refBinding !== null) {
            this.ref = bind_object(data, this.refBinding);
        }
        if (this.recommendationBinding !== null) {
            this.recommendation = bind_object(data, this.recommendationBinding);
        }
        if (this.recommendation !== null && this.recommendationNameBinding !== null) {
            this.recommendationName = bind_object(data, this.recommendationNameBinding);
        }
        if (this.recommendation !== null && this.recommendationVersionBinding !== null) {
            this.recommendationVersion = bind_object(data, this.recommendationVersionBinding);
        }
        if (this.remediationsBinding !== null) {
            this.remediations = bind_object(data, this.remediationsBinding);
        }
        if (this.highestVulnerabilityBinding !== null) {
            this.highestVulnerability = bind_object(data, this.highestVulnerabilityBinding);
        }
        if (this.highestVulnerability !== null && this.highestVulnerabilitySeverityBinding !== null) {
            this.highestVulnerabilitySeverity = bind_object(data, this.highestVulnerabilitySeverityBinding);
        }
        return this.item !== null;
    }
}

/* Report CVEs in found dependencies */
class SecurityEngine extends AnalysisConsumer implements DiagnosticProducer {
    constructor(public context: IDependency, config: any) {
        super(config);
        this.binding = { path: ['issues'] };
        this.refBinding = { path: ['ref'] };
        this.recommendationBinding = { path: ['recommendation'] };
        this.recommendationNameBinding = { path: ['recommendation', 'name'] };
        this.recommendationVersionBinding = { path: ['recommendation', 'version'] };
        this.remediationsBinding = { path: ['remediations'] };
        this.highestVulnerabilityBinding = { path: ['highestVulnerability'] };
        this.highestVulnerabilitySeverityBinding = { path: ['highestVulnerability', 'severity'] };
    }

    produce(): Vulnerability[] {
        if (this.item !== null) {
            return [new Vulnerability(
                get_range(this.context),
                this.issuesCount,
                this.ref,
                this.recommendation,
                this.recommendationName,
                this.recommendationVersion,
                this.remediations,
                this.highestVulnerabilitySeverity,
                this.context.context ? this.context.context.value : null
                )];
        } else {
            return [];
        }
    }
}

let codeActionsMap = new Map<string, CodeAction>();

export { DiagnosticsPipeline, SecurityEngine, codeActionsMap };
