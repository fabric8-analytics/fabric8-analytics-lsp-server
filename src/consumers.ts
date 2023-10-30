/* --------------------------------------------------------------------------------------------
 * Copyright (c) Red Hat
 * Licensed under the Apache-2.0 License. See License.txt in the project root for license information.
 * ------------------------------------------------------------------------------------------ */
'use strict';
import { IDependency } from './collector';
import { getRange } from './utils';
import { Vulnerability } from './vulnerability';
import { VulnerabilityAggregator } from './aggregators';
import { Diagnostic, CodeAction } from 'vscode-languageserver';

/* Descriptor describing what key-path to extract from the document */
interface IBindingDescriptor {
    path: Array<string>;
}

/* Bind & return the part of `obj` as described by `desc` */
const bindObject = (obj: any, desc: IBindingDescriptor) => {
    let bind = obj;
    for (const elem of desc.path) {
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
    refbinding: IBindingDescriptor;
    ref: string;
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
    item: IPipelineItem<T>;
    run(data: any): T;
}

/* Diagnostics producer type */
type DiagnosticProducer = IProducer<Vulnerability>;

/* Diagnostics pipeline implementation */
class DiagnosticsPipeline implements IPipeline<Vulnerability>
{
    item: IPipelineItem<Vulnerability>;
    dependency: IDependency;
    config: any;
    diagnostics: Array<Diagnostic>;
    uri: string;
    vulnerabilityAggregator: VulnerabilityAggregator;
    constructor(engine: any, dependency: IDependency, config: any, diags: Array<Diagnostic>,
        vulnerabilityAggregator: VulnerabilityAggregator, uri: string) {
        this.item = new engine(dependency, config);
        this.dependency = dependency;
        this.config = config;
        this.diagnostics = diags;
        this.uri = uri;
        this.vulnerabilityAggregator = vulnerabilityAggregator;
    }

    run(data: any): Vulnerability {
        if (this.item.consume(data)) {
            const vulnerability = this.item.produce();
            const aggVulnerability = this.vulnerabilityAggregator.aggregate(vulnerability);
            if (this.vulnerabilityAggregator.isNewVulnerability) {
                const aggDiagnostic = aggVulnerability.getDiagnostic();
                
                // if (aggVulnerability.recommendation !== null && aggVulnerability.issuesCount === 0) {
                //     let codeAction: CodeAction = {
                //         title: `Switch to version ${aggVulnerability.recommendationVersion}`,
                //         diagnostics: [aggDiagnostic],
                //         kind: CodeActionKind.QuickFix,
                //         edit: {
                //             changes: {
                //             }
                //         }
                //     };
                //     codeAction.edit.changes[this.uri] = [{
                //         range: aggDiagnostic.range,
                //         newText: vulnerability.replacement.replace(VERSION_TEMPLATE, aggVulnerability.recommendationVersion)
                //     }];
                //     codeActionsMap[aggDiagnostic.range.start.line + '|' + aggDiagnostic.range.start.character] = codeAction;
                // }
                // if (aggVulnerability.remediations && Object.keys(aggVulnerability.remediations).length > 0 && aggVulnerability.issuesCount > 0) {
                //     for (const cve of Object.keys(aggVulnerability.remediations)) {
                        
                //         let version = aggVulnerability.remediations[cve][`${aggVulnerability.ecosystem}Package`].split('@')[1];
                //         let codeAction: CodeAction = {
                //             title: `Switch to version ${version} for ${cve}`,
                //             diagnostics: [aggDiagnostic],
                //             kind: CodeActionKind.QuickFix,
                //             edit: {
                //                 changes: {
                //                 }
                //             }
                //         };
                //         codeAction.edit.changes[this.uri] = [{
                //             range: aggDiagnostic.range,
                //             newText: vulnerability.replacement.replace(VERSION_TEMPLATE, version)
                //         }];
                //         codeActionsMap[aggDiagnostic.range.start.line + '|' + aggDiagnostic.range.start.character] = codeAction;
                //     }
                // }

                if (aggDiagnostic) {
                    this.diagnostics.push(aggDiagnostic);
                }
            }
        }
        return;
    }
}

/* A consumer that uses the binding interface to consume a metadata object */
class AnalysisConsumer implements IConsumer {
    refbinding: IBindingDescriptor;
    issuesBinding: IBindingDescriptor;
    // recommendationBinding: IBindingDescriptor;
    // recommendationNameBinding: IBindingDescriptor;
    // recommendationVersionBinding: IBindingDescriptor;
    // remediationsBinding: IBindingDescriptor;
    highestVulnerabilityBinding: IBindingDescriptor;
    highestVulnerabilitySeverityBinding: IBindingDescriptor;
    ref: string = null;
    issues: any = null;
    issuesCount: number = 0;
    // recommendation: any = null;
    // recommendationName: string = null;
    // recommendationVersion: string = null;
    // remediations: any = null;
    highestVulnerability: any = null;
    highestVulnerabilitySeverity: string = null;
    constructor(public config: any) { }
    consume(data: any): boolean {
        if (this.refbinding !== null) {
            this.ref = bindObject(data, this.refbinding);
        }
        if (this.issuesBinding !== null) {
            this.issues = bindObject(data, this.issuesBinding);
            this.issuesCount = this.issues !== null ? this.issues.length : 0;
        }
        // if (this.recommendationBinding !== null) {
        //     this.recommendation = bindObject(data, this.recommendationBinding);
        // }
        // if (this.recommendation !== null && this.recommendationNameBinding !== null) {
        //     this.recommendationName = bindObject(data, this.recommendationNameBinding);
        // }
        // if (this.recommendation !== null && this.recommendationVersionBinding !== null) {
        //     this.recommendationVersion = bindObject(data, this.recommendationVersionBinding);
        // }
        // if (this.remediationsBinding !== null) {
        //     this.remediations = bindObject(data, this.remediationsBinding);
        // }
        if (this.highestVulnerabilityBinding !== null) {
            this.highestVulnerability = bindObject(data, this.highestVulnerabilityBinding);
        }
        if (this.highestVulnerability !== null && this.highestVulnerabilitySeverityBinding !== null) {
            this.highestVulnerabilitySeverity = bindObject(data, this.highestVulnerabilitySeverityBinding);
        }
        return this.ref !== null;
    }
}

/* Report CVEs in found dependencies */
class SecurityEngine extends AnalysisConsumer implements DiagnosticProducer {
    constructor(public context: IDependency, config: any) {
        super(config);
        this.refbinding = { path: ['ref'] };
        this.issuesBinding = { path: ['issues'] };
        // this.recommendationBinding = { path: ['recommendation'] };
        // this.recommendationNameBinding = { path: ['recommendation', 'name'] };
        // this.recommendationVersionBinding = { path: ['recommendation', 'version'] };
        // this.remediationsBinding = { path: ['remediations'] };
        this.highestVulnerabilityBinding = { path: ['highestVulnerability'] };
        this.highestVulnerabilitySeverityBinding = { path: ['highestVulnerability', 'severity'] };
    }

    produce(): Vulnerability {
        return new Vulnerability(
            getRange(this.context),
            this.ref,
            this.issuesCount,
            // this.recommendation,
            // this.recommendationName,
            // this.recommendationVersion,
            // this.remediations,
            this.highestVulnerabilitySeverity,
            this.context.context ? this.context.context.value : null
            );
    }
}

const codeActionsMap = new Map<string, CodeAction>();

export { DiagnosticsPipeline, SecurityEngine, codeActionsMap };