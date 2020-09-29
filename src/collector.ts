/* --------------------------------------------------------------------------------------------
 * Copyright (c) Pavel Odvody 2016
 * Licensed under the Apache-2.0 License. See License.txt in the project root for license information.
 * ------------------------------------------------------------------------------------------ */
'use strict';
import { Stream } from 'stream';
import * as Xml2Object from 'xml2object';
import * as jsonAst from 'json-to-ast';
import { IPosition, IKeyValueEntry, KeyValueEntry, Variant, ValueType } from './types';
import { stream_from_string } from './utils';

/* Please note :: There was issue with semverRegex usage in the code. During run time, it extracts 
 * version with 'v' prefix, but this is not be behavior of semver in CLI and test environment. 
 * At the moment, using regex directly to extract version information without 'v' prefix. */
//import semverRegex = require('semver-regex');
const regExp = /(?<=^v?|\sv?)(?:0|[1-9]\d*)\.(?:0|[1-9]\d*)\.(?:0|[1-9]\d*)(?:-(?:0|[1-9]\d*|[\da-z-]*[a-z-][\da-z-]*)(?:\.(?:0|[1-9]\d*|[\da-z-]*[a-z-][\da-z-]*))*)?(?:\+[\da-z-]+(?:\.[\da-z-]+)*)?(?=$|\s)/ig


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
  collect(contents: string): Promise<Array<IDependency>>;
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

class NaivePyParser {
    constructor(contents: string) {
        this.dependencies = NaivePyParser.parseDependencies(contents);
    }

    dependencies: Array<IDependency>;

    static parseDependencies(contents:string): Array<IDependency> {
        const requirements = contents.split("\n");
        return requirements.reduce((dependencies, req, index) => {
            // skip any text after #
            if (req.includes('#')) {
                req = req.split('#')[0];
            }
            const parsedRequirement: Array<string>  = req.split(/[==,>=,<=]+/);
            const pkgName:string = (parsedRequirement[0] || '').trim();
            // skip empty lines
            if (pkgName.length > 0) {
                const version = (parsedRequirement[1] || '').trim();
                const entry: IKeyValueEntry = new KeyValueEntry(pkgName, { line: 0, column: 0 });
                entry.value = new Variant(ValueType.String, version);
                entry.value_position = { line: index + 1, column: req.indexOf(version) + 1 };
                dependencies.push(new Dependency(entry));
            }
            return dependencies;
        }, []);
    }

    parse(): Array<IDependency> {
        return this.dependencies;
    }
}

/* Process entries found in the txt files and collect all dependency
 * related information */
class ReqDependencyCollector implements IDependencyCollector {
    constructor(public classes: Array<string> = ["dependencies"]) {}

    async collect(contents: string): Promise<Array<IDependency>> {
        let parser = new NaivePyParser(contents);
        return parser.parse();
    }

}

class NaiveGomodParser {
    constructor(contents: string) {
        this.dependencies = NaiveGomodParser.parseDependencies(contents);
    }

    dependencies: Array<IDependency>;

    static parseDependencies(contents:string): Array<IDependency> {
        const gomod = contents.split("\n");
        return gomod.reduce((dependencies, line, index) => {
            // Ignore "replace" lines
            if (!line.includes("=>")) {
                // skip any text after '//'
                if (line.includes("//")) {
                    line = line.split("//")[0];
                }
                // Not using semver directly, look at comment on import statement.
                //const version = semverRegex().exec(line)
                regExp.lastIndex = 0;
                const version = regExp.exec(line);
      	        // Skip lines without version string
                if (version && version.length > 0) {
                    const parts: Array<string>  = line.replace('require', '').replace('(', '').replace(')', '').trim().split(' ');
                    const pkgName:string = (parts[0] || '').trim();
                    // Ignore line starting with replace clause and empty package
                    if (pkgName.length > 0) {
                        const entry: IKeyValueEntry = new KeyValueEntry(pkgName, { line: 0, column: 0 });
                        entry.value = new Variant(ValueType.String, 'v' + version[0]);
                        entry.value_position = { line: index + 1, column: version.index };
                        dependencies.push(new Dependency(entry));
                    }
                }
            }
            return dependencies;
        }, []);
    }

    parse(): Array<IDependency> {
        return this.dependencies;
    }
}

/* Process entries found in the go.mod file and collect all dependency
 * related information */
class GomodDependencyCollector implements IDependencyCollector {
    constructor(public classes: Array<string> = ["dependencies"]) {}

    async collect(contents: string): Promise<Array<IDependency>> {
        let parser = new NaiveGomodParser(contents);
        return parser.parse();
    }

}

class NaivePomXmlSaxParser {
    constructor(stream: Stream) {
        this.stream = stream;
        this.parser = this.createParser();
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
            if (obj.hasOwnProperty("groupId") && obj.hasOwnProperty("artifactId") && obj.hasOwnProperty("version") && 
                (!obj.hasOwnProperty("scope") || (obj.hasOwnProperty("scope") && obj["scope"] != "test"))) {
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
        parser.on("end", function () {
            // the XML document doesn't have to be well-formed, that's fine
            // parser.error = null;
            this.dependencies = deps;
        });
        return parser
    }

    async parse() {
        return new Promise(resolve => {
            this.stream.pipe(this.parser.saxStream).on('end', (data) => {
                resolve(this.dependencies);
           });
        });

    }
}

class PomXmlDependencyCollector implements IDependencyCollector {
    constructor(public classes: Array<string> = ["dependencies"]) {}

    async collect(contents: string): Promise<Array<IDependency>> {
        const file = stream_from_string(contents);
        let parser = new NaivePomXmlSaxParser(file);
        let dependencies;
         await parser.parse().then(data => {
            dependencies = data;
        });
        return dependencies || [];
    }
}

class PackageJsonCollector implements IDependencyCollector {
    constructor(public classes: Array<string> = ["dependencies"]) {}

    async collect(contents: string): Promise<Array<IDependency>> {
      const ast = jsonAst(contents);
      return ast.children.
              filter(c => this.classes.includes(c.key.value)).
              flatMap(c => c.value.children).
              map(c => {
                  let entry: IKeyValueEntry = new KeyValueEntry(c.key.value, {line: c.key.loc.start.line, column: c.key.loc.start.column + 1});
                  entry.value = new Variant(ValueType.String, c.value.value);
                  entry.value_position = {line: c.value.loc.start.line, column: c.value.loc.start.column + 1};
                  return new Dependency(entry);
              });
    }
}

export { IDependencyCollector, PackageJsonCollector, PomXmlDependencyCollector, ReqDependencyCollector, GomodDependencyCollector, IPositionedString, IDependency };
