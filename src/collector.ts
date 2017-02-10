/* --------------------------------------------------------------------------------------------
 * Copyright (c) Pavel Odvody 2016
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * ------------------------------------------------------------------------------------------ */
'use strict';
import { StreamingParser, IJsonParserScope, IPosition, IKeyValueEntry } from './json';
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
    constructor(public classes: Array<string> = DefaultClasses) {}

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

export { IDependencyCollector, DependencyCollector, IPositionedString, IDependency };