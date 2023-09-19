'use strict';
import { IKeyValueEntry, KeyValueEntry, Variant, ValueType, IDependency, IDependencyProvider, Dependency } from '../collector';
import { parse, DocumentCstNode } from '@xml-tools/parser';
import { buildAst, accept, XMLElement, XMLDocument } from '@xml-tools/ast';
import { VERSION_TEMPLATE } from '../utils';

export class DependencyProvider implements IDependencyProvider {
    private xmlDocAst: XMLDocument;
    private originalDeps: Array<XMLElement>;
    ecosystem: string;

    constructor(originalContents: string, enforceVersions: boolean, public classes: Array<string> = ['dependencies']) {
        this.ecosystem = 'maven';
        const { cst, tokenVector } = parse(originalContents);
        const originalXmlDocAst = buildAst(cst as DocumentCstNode, tokenVector);
        if (originalXmlDocAst.rootElement) {
            this.originalDeps = this.getXMLDependencies(originalXmlDocAst, enforceVersions);
        }
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

    private mapToDependency(dependenciesNode: XMLElement[]): Array<IDependency> {
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

            isValidWithVersion(): boolean {
                // none should have a empty text.
                return [this.groupId, this.artifactId, this.version].find(e => !e.textContents[0]?.text) === undefined;
            }

        };

        const toDependency = (resolved: PomDependency, original: PomDependency): Dependency => {
            const dep: IKeyValueEntry = new KeyValueEntry(
                `${original.groupId.textContents[0].text}/${original.artifactId.textContents[0].text}`,
                { line: original.element.position.startLine, column: original.element.position.startColumn }
            );
            dep.context_range = {
                start: { line: original.element.position.startLine - 1, character: original.element.position.startColumn - 1 },
                end: { line: original.element.position.endLine - 1, character: original.element.position.endColumn }
            };
            dep.value = new Variant(ValueType.String, resolved.version.textContents[0].text);

            if (original.version) {
                const versionVal = original.version.textContents[0];
                dep.value_position = { line: versionVal.position.startLine, column: versionVal.position.startColumn };
            } else {
                dep.value_position = { line: 0, column: 0 };
                dep.context = dependencyTemplate(original.element);
            }
            return new Dependency(dep);
        };

        const dependencyTemplate = (original: XMLElement): string => {
            let template = '<dependency>';
            let hasVersion = false;
            let idx = 0;
            let margin = original.textContents[idx].text;
            original.subElements.forEach(e => {
                if (e.name === 'version') {
                    template += `${original.textContents[idx++].text}<${e.name}>${VERSION_TEMPLATE}</${e.name}>`;
                } else {
                    template += `${original.textContents[idx++].text}<${e.name}>${e.textContents[0].text}</${e.name}>`;
                }
            });
            if (!hasVersion) {
                template += `${margin}<version>${VERSION_TEMPLATE}</version>`;
            }
            template += `${original.textContents[idx].text}</dependency>`;
            return template;
        };

        const getMapKey = (element: PomDependency): string => {
            return `${element.groupId.textContents[0].text}/${element.artifactId.textContents[0].text}`;
        };

        const buildDependencyMap = (original: Array<PomDependency>, resolved: Array<PomDependency>): Array<PomDependency> => {
            let result = new Array<PomDependency>();
            if (original) {
                const visited = new Map<string, number>();
                let resolvedIdx = 0;
                original.forEach(o => {
                    const k = getMapKey(o);
                    let r = visited.get(k);
                    if(r === undefined) {
                        r = resolvedIdx++;
                        visited.set(k, r);
                    }
                    if(resolved[r] !== undefined) {
                        result.push(resolved[r]);
                    } else {
                        result.push(null);
                    }
                });
            }
            return result;
        };

        if (this.originalDeps) {
            const toPomDep = (nodes: XMLElement[]): Array<PomDependency> => nodes
                // no test dependencies
                .filter(e => !e.subElements.find(e => (e.name === 'scope' && e.textContents[0].text === 'test')))
                .map(e => new PomDependency(e));

            const resolvedDeps = toPomDep(dependenciesNode).filter(e => e.isValidWithVersion());
            const origDeps = toPomDep(this.originalDeps).filter(e => e.isValid());

            const resolvedMap = buildDependencyMap(origDeps, resolvedDeps);
            const result = new Array();
            origDeps.forEach((d, idx) => {
                if(resolvedMap[idx] !== null) {
                    result.push(toDependency(resolvedMap[idx], d));
                }
            });
            return result;
        }
        return new Array();
    }

    async collect(contents: string): Promise<Array<IDependency>> {
        this.parseXml(contents);
        const deps = this.getXMLDependencies(this.xmlDocAst, true);
        return this.mapToDependency(deps);
    }

    private getXMLDependencies(doc: XMLDocument, enforceVersions: boolean): Array<XMLElement> {
        let validElementNames = ['groupId', 'artifactId'];
        if(enforceVersions) {
            validElementNames.push('version');
        }

        return this.findRootNodes(doc, 'dependencies')
            //must not be a dependency under dependencyManagement
            .filter(e => {
                const parentElement = e.parent as XMLElement | undefined;

                if (parentElement) {
                    return parentElement.name !== 'dependencyManagement';
                }
                return true;
            })
            .map(node => node.subElements)
            .flat(1)
            .filter(e => e.name === 'dependency')
            // must include all validElementNames
            .filter(e => e.subElements.filter(e => validElementNames.includes(e.name)).length === validElementNames.length);
    }
}
