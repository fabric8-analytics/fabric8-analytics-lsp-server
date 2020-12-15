'use strict';
import { IKeyValueEntry, KeyValueEntry, Variant, ValueType, IDependency, IDependencyCollector, Dependency, IPositionedString, IPosition } from './types';
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
        class PomDependency {
            public groupId: XMLElement;
            public artifactId: XMLElement;
            public version: XMLElement;
            constructor(e: XMLElement) {
                this.groupId = e.subElements.find(e => e.name === 'groupId');
                this.artifactId = e.subElements.find(e => e.name === 'artifactId');
                this.version = e.subElements.find(e => e.name === 'version');
            }

            isValid(): boolean {
                // none should have a empty text.
                return [this.groupId, this.artifactId, this.version].find(e => !e.textContents[0]?.text) === undefined;
            }

            toDependency(): Dependency {
                const dep: IKeyValueEntry = new KeyValueEntry(`${this.groupId.textContents[0].text}:${this.artifactId.textContents[0].text}`, {line: 0, column: 0});
                const versionVal = this.version.textContents[0];
                dep.value = new Variant(ValueType.String, versionVal.text);
                dep.value_position = {line: versionVal.position.startLine, column: versionVal.position.startColumn};
                return new Dependency(dep);
            }
        };
        const validElementNames = ['groupId', 'artifactId', 'version'];
        const dependencies = dependenciesNode?.
            subElements.
            filter(e => e.name === 'dependency').
            // must include all validElementNames
            filter(e => e.subElements.filter(e => validElementNames.includes(e.name)).length == validElementNames.length).
            // no test dependencies
            filter(e => !e.subElements.find(e => (e.name === 'scope' && e.textContents[0].text === 'test'))).
            map(e => new PomDependency(e)).
            filter(d => d.isValid()).
            map(d => d.toDependency());
        return dependencies || [];
    }

    private createPropertySubstitution(e: XMLElement): Map<string, IPositionedString> {
        return new Map(e?.subElements?.
            filter(e => e.textContents[0]?.text).
            map(e => {
                const propertyValue = e.textContents[0];
                const position: IPosition = {line: propertyValue.position.startLine, column: propertyValue.position.startColumn};
                const value = {value: propertyValue.text, position: position} as IPositionedString;
                // key should be equivalent to pom.xml property format. i.e ${property.value}
                return [`\$\{${e.name}\}`, value];
        }));
    }

    private applyProperty(dependency: IDependency, map: Map<string, IPositionedString>): IDependency {
        // FIXME: Do the groupId and artifactId will also be expressed through properties?
        dependency.version = map.get(dependency.version.value) ?? dependency.version;
        return dependency; 
    }

    async collect(contents: string): Promise<Array<IDependency>> {
        this.parseXml(contents);
        const deps = this.findRootNodes("dependencies");
        // lazy eval
        const getPropertyMap = (() => {
            let propertyMap = null;
            return () => {
                propertyMap = propertyMap ?? this.createPropertySubstitution(this.findRootNodes("properties")[0]);
                return propertyMap;
            };
        })();

        return deps.flatMap(dep => this.mapToDependency(dep)).map(d => this.applyProperty(d, getPropertyMap()));
    }
}
