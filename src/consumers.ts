/* --------------------------------------------------------------------------------------------
 * Copyright (c) Pavel Odvody 2016
 * Licensed under the Apache-2.0 License. See License.txt in the project root for license information.
 * ------------------------------------------------------------------------------------------ */
'use strict';
import { IDependency } from './collector';
import { get_range } from './utils';
import { Diagnostic, DiagnosticSeverity, CodeAction, CodeActionKind, DocumentUri } from 'vscode-languageserver'

/* Descriptor describing what key-path to extract from the document */
interface IBindingDescriptor
{
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
interface IConsumer
{
    binding: IBindingDescriptor;
    item: any;
    vulnerabilityCount: any;
    advisoryCount: any;
    consume(data: any): boolean;
};

/* Generic `T` producer */
interface IProducer<T>
{
    produce(ctx: any): T;
};

/* Each pipeline item is defined as a single consumer and producer pair */
interface IPipelineItem<T> extends IConsumer, IProducer<T> {};

/* House bunches of `IPipelineItem`'s */
interface IPipeline<T>
{
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
                for (let d of item.produce(this.uri))
                    this.diagnostics.push(d);
            }
        }
        return this.diagnostics;
    }
};

/* A consumer that uses the binding interface to consume a metadata object */
class AnalysisConsumer implements IConsumer
{
    binding: IBindingDescriptor;
    changeToBinding: IBindingDescriptor;
    registrationLinkBinding : IBindingDescriptor;
    messageBinding : IBindingDescriptor;
    vulnerabilityCountBinding : IBindingDescriptor;
    advisoryCountBinding : IBindingDescriptor;
    item: any;
    changeTo: string = null;
    registrationLink: string = null;
    message: string = null;
    vulnerabilityCount: number = 0;
    advisoryCount: number = 0;
    constructor(public config: any){}
    consume(data: any): boolean {
        if (this.binding != null) {
            this.item = bind_object(data, this.binding);
        } else {
            this.item = data;
        }
        if (this.changeToBinding != null) {
            this.changeTo = bind_object(data, this.changeToBinding);
        }
        if (this.registrationLinkBinding != null) {
            this.registrationLink = bind_object(data, this.registrationLinkBinding);
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
        return this.item != null;
    }
};

/* We've received an empty/unfinished result, display that analysis is pending */
class EmptyResultEngine extends AnalysisConsumer implements DiagnosticProducer
{
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
                source: 'Dependency Analytics'
            }]
        } else {
            return [];
        }
    }   
}

/* Report CVEs in found dependencies */
class SecurityEngine extends AnalysisConsumer implements DiagnosticProducer
{
    constructor(public context: IDependency, config: any) {
        super(config);
        this.binding = {path: ['component_analyses', 'vulnerability']};
        /* recommendation to use a different version */
        this.changeToBinding = {path: ['recommended_versions']};
        /* snyk registration link */
        this.registrationLinkBinding = {path: ['registration_link']};
        /* Diagnostic message */
        this.messageBinding = {path: ['message']};
        /* Publicly known Security Vulnerability count */
        this.vulnerabilityCountBinding = {path: ['known_security_vulnerability_count']};
        /* Private Security Advisory count */
        this.advisoryCountBinding = {path: ['security_advisory_count']};
    }

    produce(ctx: any): Diagnostic[] {
        if (this.item.length > 0) {
            /* DocumentUri as a URI object to pass URLs */
            this.registrationLink as DocumentUri;
            /* The diagnostic's severity. */
            let diagSeverity;

            if (this.vulnerabilityCount == 0 && this.advisoryCount > 0) {
                diagSeverity = DiagnosticSeverity.Information; 
            } else {
                diagSeverity = DiagnosticSeverity.Error;
            }

            let diagnostic = {
                severity: diagSeverity,
                range: get_range(this.context.version),
                message: `${this.message}`,
                source: 'Dependency Analytics',
                code: `Find out more: ${this.registrationLink}` 
            };

            // TODO: this can be done lazily
            if (this.changeTo != null && this.vulnerabilityCount > 0) {
                let codeAction: CodeAction = {
                    title: "Switch to recommended version " + this.changeTo,
                    diagnostics: [diagnostic],
                    kind: CodeActionKind.QuickFix,  //provide a QuickFix option if recommended version is available
                    edit: {
                        changes: {
                        }
                    }
                };
                codeAction.edit.changes[ctx]= [{
                    range: diagnostic.range,
                    newText: this.changeTo
                }];
                codeActionsMap[diagnostic.message] = codeAction
            }
            return [diagnostic]
        } else {
            return [];
        }
    }
};

let codeActionsMap = new Map<string, CodeAction>();

export { DiagnosticsPipeline, SecurityEngine, EmptyResultEngine, codeActionsMap };
