/* --------------------------------------------------------------------------------------------
 * Copyright (c) Pavel Odvody 2016
 * Licensed under the Apache-2.0 License. See License.txt in the project root for license information.
 * ------------------------------------------------------------------------------------------ */
'use strict';
import { StreamingParser, IPosition, IKeyValueEntry, KeyValueEntry, Variant, ValueType } from './json';
import * as Xml2Object from 'xml2object';
import { Stream } from 'stream';

/* By default the collector is going to process these dependency keys */
const DefaultClasses = ["dependencies", "devDependencies", "optionalDependencies"];

/* String value with position */
interface IPositionedString {
  value:    string;
  position: IPosition;
}

/* Dependency specification */
interface IDependency {
  name:    IPositionedString;
  version: IPositionedString;
}

/* Dependency collector interface */
interface IDependencyCollector {
  classes: Array<string>;
  collect(file: Stream): Promise<Array<IDependency>>;
}

/* Dependency class that can be created from `IKeyValueEntry` */
class Dependency implements IDependency {
  name:    IPositionedString;
  version: IPositionedString;
  constructor(dependency: IKeyValueEntry) {
    this.name = {
        value: dependency.key, 
        position: dependency.key_position
    }; 
    this.version = {
        value: dependency.value.object, 
        position: dependency.value_position
    }
  }
}

/* Process entries found in the JSON files and collect all dependency
 * related information */
class DependencyCollector implements IDependencyCollector {
    constructor(public classes) {
        this.classes = classes || DefaultClasses
    }

    async collect(file: Stream): Promise<Array<IDependency>> {
        let parser = new StreamingParser(file);
        let dependencies: Array<IDependency> = [];
        let tree = await parser.parse();
        let top_level = tree.children[0];

        /* Iterate over all keys, select those in which we're interested as defined
        by `classes`, and map each item to a new `Dependency` object */
        for (const p of top_level.properties) {
            if (this.classes.indexOf(p.key) > -1) {
                for (const dependency of <[IKeyValueEntry]> p.value.object) {
                    dependencies.push(new Dependency(dependency));
                }
            }
        }

        return dependencies;
    }
}

class NaivePomXmlSaxParser {
    constructor(stream: Stream) {
        this.stream = stream;
        this.parser = this.createParser()
    }

    stream: Stream;
    parser: Xml2Object;
    dependencies: Array<IDependency> = [];
    isDependency: boolean = false;
    versionStartLine: number = 0;
    versionStartColumn: number = 0;

    createParser(): Xml2Object {
        let parser = new Xml2Object([ "dependency" ], {strict: true, trackPosition: true});
        let deps = this.dependencies;
        let versionLine = this.versionStartLine;
        let versionColumn = this.versionStartColumn;

        parser.on("object", function (name, obj) {
            if (obj.hasOwnProperty("groupId") && obj.hasOwnProperty("artifactId") && obj.hasOwnProperty("version")) {
                let ga = `${obj["groupId"]}:${obj["artifactId"]}`;
                let entry: IKeyValueEntry = new KeyValueEntry(ga, {line: 0, column: 0});
                entry.value = new Variant(ValueType.String, obj["version"]);
                entry.value_position = {line: versionLine, column: versionColumn};
                let dep: IDependency = new Dependency(entry);
                deps.push(dep)
            }
        });
        parser.saxStream.on("opentag", function (node) {
            if (node.name == "dependency") {
                this.isDependency = true;
            }
            if (this.isDependency && node.name == "version") {
                versionLine = parser.saxStream._parser.line + 1;
                versionColumn = parser.saxStream._parser.column +1;
            }
        });
        parser.saxStream.on("closetag", function (nodeName) {
            // TODO: nested deps!
            if (nodeName == "dependency") {
                this.isDependency = false;
            }
        });
        parser.on("error", function (e) {
            // the XML document doesn't have to be well-formed, that's fine
            parser.error = null;
        });
        return parser
    }

    parse(): Array<IDependency> {
        try {
            this.stream.pipe(this.parser.saxStream);
        } catch (e) {
            console.error(e.message)
        }
        return this.dependencies
    }
}

class PomXmlDependencyCollector {
    constructor(public classes: Array<string> = ["dependencies"]) {}

    async collect(file: Stream): Promise<Array<IDependency>> {
        let parser = new NaivePomXmlSaxParser(file);
        let dependencies: Array<IDependency> = parser.parse();
        return dependencies;
    }
}

export { IDependencyCollector, DependencyCollector, PomXmlDependencyCollector, IPositionedString, IDependency };
