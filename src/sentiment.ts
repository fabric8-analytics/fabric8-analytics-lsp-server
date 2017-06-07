/* --------------------------------------------------------------------------------------------
 * Copyright (c) Pavel Odvody 2016
 * Licensed under the Apache-2.0 License. See License.txt in the project root for license information.
 * ------------------------------------------------------------------------------------------ */
'use strict';
import { IDependency } from './collector';
import { get_range } from './utils';
import { Diagnostic, DiagnosticSeverity, Command } from 'vscode-languageserver'

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
    produce(): T;
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
class DiagnosticsPipelineSenti implements IPipeline<Diagnostic[]>
{
    items: Array<IPipelineItem<Diagnostic[]>>;
    dependency: IDependency;
    config: any;
    diagnostics: Array<Diagnostic>;
    constructor(classes: Array<any>, dependency: IDependency, config: any, diags: Array<Diagnostic>) {
        this.items = classes.map((i) => { return new i(dependency, config); });
        this.dependency = dependency;
        this.config = config;
        this.diagnostics = diags;
    }

    run(data: any): Diagnostic[] {
        for (let item of this.items) {
            if (item.consume(data)) {
                for (let d of item.produce())
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
    item: any;
    changeTo: string = null;
    constructor(public config: any){}
    consume(data: any): boolean {
            if(data && data.sentiment_details && data.sentiment_details.hasOwnProperty("latest_comment") && 
            data.sentiment_details.latest_comment != '' && data.sentiment_details.hasOwnProperty("overall_sentiment_score") &&
            data.sentiment_details.overall_sentiment_score != 0)
            {
                let sentiCommentObj = {
                    "sentiment" : "",
                    "comment" : ""
                };
                if(Number(data.sentiment_details.overall_sentiment_score.trim())>0){
                    sentiCommentObj.sentiment = "Postive";
                } else if(Number(data.sentiment_details.overall_sentiment_score.trim())<0){
                    sentiCommentObj.sentiment = "Negative";
                } else{
                    sentiCommentObj.sentiment = "Neutral";
                }
                sentiCommentObj['timestamp'] = data.sentiment_details.latest_comment_time;
                sentiCommentObj.comment = data.sentiment_details.latest_comment;
                this.item = [];
                this.item.push(sentiCommentObj);
            }
        return this.item != null;
    }
};

/* We've received an empty/unfinished result, display that analysis is pending */
class EmptyResultEngineSenti extends AnalysisConsumer implements DiagnosticProducer
{
    constructor(public context: IDependency, config: any) {
        super(config);
    }

    produce(): Diagnostic[] {
        if (this.item == {} || 
            this.item.finished_at === undefined ||
            this.item.finished_at == null) {
            return [{
                severity: DiagnosticSeverity.Information,
                range: get_range(this.context.version),
                message: `Package ${this.context.name.value}-${this.context.version.value} - analysis is pending`,
                source: 'Sentiment Analysis'
            }]
        } else {
            return [];
        }
    }   
}

/* Report CVEs in found dependencies */
class SecurityEngineSenti extends AnalysisConsumer implements DiagnosticProducer
{
    constructor(public context: IDependency, config: any) {
        super(config);
    }

    produce(): Diagnostic[] {
        if (this.item.length > 0) {
            let sentimentData: Array<any> = this.item;
            let diagnostic = {
                severity: DiagnosticSeverity.Information,
                range: get_range(this.context.version),
                message: `Sentiment : ${sentimentData[0].sentiment} , Last comment as on [${sentimentData[0]['timestamp']}]: ${sentimentData[0].comment}`,
                source: 'Sentiment Analysis'
            };
            return [diagnostic]
        } else {
            return [];
        }
    }
};

let codeActionsMapSenti = new Map<string, Command>();

export { DiagnosticsPipelineSenti, SecurityEngineSenti, EmptyResultEngineSenti, codeActionsMapSenti };
