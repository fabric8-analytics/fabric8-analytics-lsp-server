/* --------------------------------------------------------------------------------------------
 * Copyright (c) Pavel Odvody 2016
 * Licensed under the Apache-2.0 License. See License.txt in the project root for license information.
 * ------------------------------------------------------------------------------------------ */
'use strict';
import { IDependency } from './collector';
import { get_range } from './utils';
import { Diagnostic, DiagnosticSeverity, CodeAction, CodeActionKind, DocumentUri } from 'vscode-languageserver'

/* Count total # of Public and Private Vulnerability */
let VulPublic = 0;
let VulPrivate = 0;

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
    regLinkBinding : IBindingDescriptor;
    messageBinding : IBindingDescriptor;
    pubVulBinding : IBindingDescriptor;
    pvtVulBinding : IBindingDescriptor;
    item: any;
    changeTo: string = null;
    regLink: string = null;
    message: string = null;
    pubVul: number = 0;
    pvtVul: number = 0;
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
        if (this.regLinkBinding != null) {
            this.regLink = bind_object(data, this.regLinkBinding);
        }
        if (this.messageBinding != null) {
            this.message = bind_object(data, this.messageBinding);
        }
        if (this.pubVulBinding != null) {
            this.pubVul = bind_object(data, this.pubVulBinding);
        }
        if (this.pvtVulBinding != null) {
            this.pvtVul = bind_object(data, this.pvtVulBinding);
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

/* DocumentUri as a URI object to pass URLs */
let targerLink : DocumentUri;

/* Report CVEs in found dependencies */
class SecurityEngine extends AnalysisConsumer implements DiagnosticProducer
{
    constructor(public context: IDependency, config: any) {
        super(config);
        this.binding = {path: ['component_analyses', 'vulnerability']};
        /* recommendation to use a different version */
        this.changeToBinding = {path: ['recommended_versions']};
        /* snyk registration link */
        this.regLinkBinding = {path: ['registration_link']};
        /* Diagnostic message */
        this.messageBinding = {path: ['message']};
        /* Public and Private vulnerability count */
        this.pubVulBinding = {path: ['known_security_vulnerability_count']};
        this.pvtVulBinding = {path: ['security_advisory_count']};
    }

    produce(ctx: any): Diagnostic[] {
        if (this.item.length > 0) {
            /* Counting total # of Public and Private Vulnerability */
            VulPrivate += this.pvtVul;
            VulPublic += this.pubVul;
            /* Assign a string to a type DocumentUri */
            targerLink = this.regLink;
            /* The diagnostic's severity. */
            let diagSeverity;

            if (this.pubVul == 0 && this.pvtVul > 0) {
                diagSeverity = DiagnosticSeverity.Information; 
            } else {
                diagSeverity = DiagnosticSeverity.Error;
            }

            let diagnostic = {
                severity: diagSeverity,
                range: get_range(this.context.version),
                message: `${this.message}`,
                source: 'Dependency Analytics',
                code: `Find out more: ${targerLink}` 
            };

            // TODO: this can be done lazily
            if (this.changeTo != null && this.pubVul > 0) {
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
/* Reset Public and Private Vulnerability counts to zero*/
let SetDefault = (v1: number, v2: number) => {
    VulPrivate = v1;
    VulPublic = v2;
};

export { DiagnosticsPipeline, SecurityEngine, EmptyResultEngine, codeActionsMap, VulPrivate, VulPublic, SetDefault };
