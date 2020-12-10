'use strict';
import { IKeyValueEntry, KeyValueEntry, Variant, ValueType, IDependency, IDependencyCollector, Dependency } from './types';
import { parse, DocumentCstNode } from "@xml-tools/parser";
import { buildAst, accept, XMLElement, XMLDocument } from "@xml-tools/ast";

export class PomXmlDependencyCollector implements IDependencyCollector {
    private xmlDocAst: XMLDocument;

    constructor(public classes: Array<string> = ["dependencies"]) {}

    private findRootNodes(rootElementName: string): Array<XMLElement> {
        const properties: Array<XMLElement> = [];
        const propertiesElement = {
            // Will be invoked once for each Element node in the AST.
            visitXMLElement: (node: XMLElement) => {
                if (node.name === rootElementName) {
                    properties.push(node);
                }
            },
        };
        accept(this.xmlDocAst, propertiesElement);
        return properties;
    }

    private parseXml(contents: string): void {
        const { cst, tokenVector } = parse(contents);
        this.xmlDocAst = buildAst(cst as DocumentCstNode, tokenVector);
    }

    private mapToDependency(dependenciesNode: XMLElement): Array<IDependency> {
        const dependencies = dependenciesNode?.
            subElements.
            filter(e => e.name === 'dependency').
            filter(e => !e.subElements.find(e => (e.name == 'scope' && e.textContents?.[0].text == 'test'))).
            map(e => {
            const groupId = e.subElements.find(e => e.name == 'groupId');
            const artifactId = e.subElements.find(e => e.name == 'artifactId');
            const version = e.subElements.find(e => e.name == 'version');
            let entry: IKeyValueEntry = new KeyValueEntry(`${groupId.textContents[0].text}:${artifactId.textContents[0].text}`, {line: 0, column: 0});
            const versionVal = version.textContents[0];
            entry.value = new Variant(ValueType.String, versionVal.text);
            entry.value_position = {line: versionVal.position.startLine, column: versionVal.position.startColumn};
            return new Dependency(entry);
        });
        return dependencies;
    }

    async collect(contents: string): Promise<Array<IDependency>> {
        this.parseXml(contents);
        const properties = this.findRootNodes("properties");
        const deps = this.findRootNodes("dependencies");
        return this.mapToDependency(deps[0]) || [];
    }
}
