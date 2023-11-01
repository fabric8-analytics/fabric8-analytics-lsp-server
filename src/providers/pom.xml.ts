'use strict';
import { IKeyValueEntry, KeyValueEntry, Variant, ValueType, IDependency, IDependencyProvider, Dependency } from '../collector';
import { parse, DocumentCstNode } from '@xml-tools/parser';
import { buildAst, accept, XMLElement, XMLDocument } from '@xml-tools/ast';
import { VERSION_PLACEHOLDER } from '../constants';

export class DependencyProvider implements IDependencyProvider {
    private xmlDocAst: XMLDocument;
    ecosystem: string;

    constructor(public classes: Array<string> = ['dependencies']) {
        this.ecosystem = 'maven';
    }

    private findRootNodes(document: XMLDocument, rootElementName: string): Array<XMLElement> {
        const properties: Array<XMLElement> = [];
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

    private parseXml(contents: string): void {
        const { cst, tokenVector } = parse(contents);
        this.xmlDocAst = buildAst(cst as DocumentCstNode, tokenVector);
    }

    private mapToDependency(deps: XMLElement[]): Array<IDependency> {
        class PomDependency {
            public element: XMLElement;
            public groupId: XMLElement;
            public artifactId: XMLElement;
            public version: XMLElement;
            constructor(element: XMLElement) {
                this.element = element;
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
            const dep: IKeyValueEntry = new KeyValueEntry(
                `${d.groupId.textContents[0].text}/${d.artifactId.textContents[0].text}`,
                { line: d.element.position.startLine, column: d.element.position.startColumn }
            );
            dep.contextRange = {
                start: { line: d.element.position.startLine - 1, character: d.element.position.startColumn - 1 },
                end: { line: d.element.position.endLine - 1, character: d.element.position.endColumn }
            };

            if (d.version && d.version.textContents.length > 0) {
                dep.value = new Variant(ValueType.String, d.version.textContents[0].text);
                const versionVal = d.version.textContents[0];
                dep.valuePosition = { line: versionVal.position.startLine, column: versionVal.position.startColumn };
            } else {
                dep.value = new Variant(ValueType.String, '');
                dep.valuePosition = { line: 0, column: 0 };
                dep.context = dependencyTemplate(d.element);
            }
            return new Dependency(dep);
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

        const purgeTestDeps = (nodes: XMLElement[]): Array<PomDependency> => nodes
            // no test dependencies
            .filter(e => !e.subElements.find(elm => (elm.name === 'scope' && elm.textContents[0]?.text === 'test')))
            .map(e => new PomDependency(e));

        const validDeps = purgeTestDeps(deps).filter(e => e.isValid());

        const result = [];
        validDeps.forEach((d) => {
                result.push(toDependency(d));
        });
        return result;
    }

    async collect(contents: string): Promise<Array<IDependency>> {
        this.parseXml(contents);
        const deps = this.getXMLDependencies(this.xmlDocAst);
        return this.mapToDependency(deps);
    }

    private getXMLDependencies(doc: XMLDocument): Array<XMLElement> {
        const validElementNames = ['groupId', 'artifactId'];

        return this.findRootNodes(doc, 'dependencies')
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
}
