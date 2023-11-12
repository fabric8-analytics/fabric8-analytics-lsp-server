'use strict';
import { IDependencyProvider, EcosystemDependencyResolver, IDependency, Dependency } from '../collector';
import { parse, DocumentCstNode } from '@xml-tools/parser';
import { buildAst, accept, XMLElement, XMLDocument } from '@xml-tools/ast';
import { VERSION_PLACEHOLDER } from '../constants';

export class DependencyProvider extends EcosystemDependencyResolver implements IDependencyProvider {

    constructor() {
        super('maven'); // set ecosystem to 'maven'
    }

    private parseXml(contents: string): XMLDocument {
        const { cst, tokenVector } = parse(contents);
        return buildAst(cst as DocumentCstNode, tokenVector);
    }
    
    private findRootNodes(document: XMLDocument, rootElementName: string): XMLElement[] {
        const properties: XMLElement[] = [];
        const propertiesElement = {
            // Will be invoked once for each Element node in the AST.
            visitXMLElement: (node: XMLElement) => {
                if (node.name === rootElementName) {
                    properties.push(node);
                }
            },
        };
        accept(document, propertiesElement);
        return properties;
    }
    
    private getXMLDependencies(xmlAst: XMLDocument): XMLElement[] {
        const validElementNames = ['groupId', 'artifactId'];

        return this.findRootNodes(xmlAst, 'dependencies')
            //must not be a dependency under dependencyManagement
            .filter(e => {
                const parentElement = e.parent as XMLElement | undefined;
                return parentElement?.name !== 'dependencyManagement';
            })
            .map(node => node.subElements)
            .flat(1)
            .filter(e => e.name === 'dependency')
            // must include all validElementNames
            .filter(e => e.subElements.filter(elm => validElementNames.includes(elm.name)).length === validElementNames.length);
    }

    private mapDependencies(deps: XMLElement[]): IDependency[] {

        class PomDependency {
            public groupId: XMLElement;
            public artifactId: XMLElement;
            public version: XMLElement;
            constructor(public element: XMLElement) {
                this.groupId = element.subElements.find(e => e.name === 'groupId');
                this.artifactId = element.subElements.find(e => e.name === 'artifactId');
                this.version = element.subElements.find(e => e.name === 'version');
            }

            isValid(): boolean {
                // none should have a empty text.
                return [this.groupId, this.artifactId].find(e => !e.textContents[0]?.text) === undefined;
            }

        }

        const toDependency = (d: PomDependency): Dependency => {
            const dep: Dependency = new Dependency(
                { value: `${d.groupId.textContents[0].text}/${d.artifactId.textContents[0].text}`, 
                    position: { line: d.element.position.startLine, column: d.element.position.startColumn } },
            );        
            
            dep.context = { value: '', range: {
                    start: { line: d.element.position.startLine - 1, character: d.element.position.startColumn - 1 },
                    end: { line: d.element.position.endLine - 1, character: d.element.position.endColumn }
                },
            }

            if (d.version && d.version.textContents.length > 0) {
                const versionVal = d.version.textContents[0];
                dep.version = {
                    value: d.version.textContents[0].text,
                    position: { line: versionVal.position.startLine, column: versionVal.position.startColumn },
                }
            } else {
                dep.version = {
                    value: '',
                    position: { line: 0, column: 0 },
                }
                dep.context.value = dependencyTemplate(d.element);
            }

            return dep;
        };

        const dependencyTemplate = (dep: XMLElement): string => {
            let template = '<dependency>';
            let idx = 0;
            const margin = dep.textContents[idx].text;

            dep.subElements.forEach(e => {
                if (e.name !== 'version') {
                    template += `${dep.textContents[idx++].text}<${e.name}>${e.textContents[0].text}</${e.name}>`;
                }
            });

            template += `${margin}<version>${VERSION_PLACEHOLDER}</version>`;
            template += `${dep.textContents[idx].text}</dependency>`;
            
            return template;
        };
        
        return deps
            .filter(elm => !elm.subElements.find(subElm => (subElm.name === 'scope' && subElm.textContents[0]?.text === 'test')))
            .map(usableElm => new PomDependency(usableElm))
            .filter(pomDep => pomDep.isValid())
            .map(validPomDep => toDependency(validPomDep));
    }

    async collect(contents: string): Promise<IDependency[]> {
        const xmlAst: XMLDocument = this.parseXml(contents);
        const deps = this.getXMLDependencies(xmlAst);
        return this.mapDependencies(deps);
    }

}
