'use strict';

import { IKeyValueEntry, KeyValueEntry, Variant, ValueType, IDependency, IDependencyProvider, Dependency } from '../collector';

/* Please note :: There was issue with semverRegex usage in the code. During run time, it extracts
 * version with 'v' prefix, but this is not be behavior of semver in CLI and test environment.
 * At the moment, using regex directly to extract version information without 'v' prefix. */
//import semverRegex = require('semver-regex');
function semVerRegExp(line: string): RegExpExecArray {
    const regExp = /(?<=^v?|\sv?)(?:0|[1-9]\d*)\.(?:0|[1-9]\d*)\.(?:0|[1-9]\d*)(?:-(?:0|[1-9]\d*|[\da-z-]*[a-z-][\da-z-]*)(?:\.(?:0|[1-9]\d*|[\da-z-]*[a-z-][\da-z-]*))*)?(?:\+[\da-z-]+(?:\.[\da-z-]+)*)?(?=$|\s)/ig;
    return regExp.exec(line);
}

class NaiveGomodParser {
    constructor(contents: string) {
        this.dependencies = NaiveGomodParser.parseDependencies(contents);
    }

    dependencies: Array<IDependency>;

    static getReplaceMap(line: string, index: number): any{
        // split the replace statements by '=>'
        const parts: Array<string> = line.replace('replace', '').replace('(', '').replace(')', '').trim().split('=>');
        const replaceWithVersion = semVerRegExp(parts[1]);

        // Skip lines without final version string
        if (replaceWithVersion && replaceWithVersion.length > 0) {
            const replaceTo: Array<string> = (parts[0] || '').trim().split(' ');
            const replaceToVersion = semVerRegExp(replaceTo[1]);
            const replaceWith: Array<string> = (parts[1] || '').trim().split(' ');
            const replaceWithIndex = line.lastIndexOf(parts[1]);
            const replaceEntry: IKeyValueEntry = new KeyValueEntry(replaceWith[0].trim(), { line: 0, column: 0 });
            replaceEntry.value = new Variant(ValueType.String, 'v' + replaceWithVersion[0]);
            replaceEntry.value_position = { line: index + 1, column: (replaceWithIndex + replaceWithVersion.index) };
            const replaceDependency = new Dependency(replaceEntry);
            const isReplaceToVersion: boolean = replaceToVersion && replaceToVersion.length > 0;
            return {key: replaceTo[0].trim() + (isReplaceToVersion ? ('@v' + replaceToVersion[0]) : ''), value: replaceDependency};
        }
        return null;
    }

    static  applyReplaceMap(dep: IDependency, replaceMap: Map<string, IDependency>): IDependency {
        let replaceDependency = replaceMap.get(dep.name.value + '@' + dep.version.value);
        if (replaceDependency === undefined) {
            replaceDependency = replaceMap.get(dep.name.value);
            if(replaceDependency === undefined) {
                return dep;
            }
        }
        return replaceDependency;
    }

    static parseDependencies(contents:string): Array<IDependency> {
        let replaceMap = new Map<string, IDependency>();
        let isExcluded = false;
        let goModDeps = contents.split('\n').reduce((dependencies, line, index) => {
            // ignore excluded dependencies
            if (line.includes('exclude')) {
                if (line.includes('(')) {
                    isExcluded = true;
                }
                return dependencies;
            }
            if (isExcluded) {
                if (line.includes(')')) {
                    isExcluded = false;
                }
                return dependencies;
            }

            // skip any text after '//'
            if (line.includes('//')) {
                line = line.split('//')[0];
            }

            // stash replacement dependencies for replacement
            if (line.includes('=>')) {
                let replaceEntry = NaiveGomodParser.getReplaceMap(line, index);
                if (replaceEntry) {
                    replaceMap.set(replaceEntry.key, replaceEntry.value);
                }
            } else {
                // Not using semver directly, look at comment on import statement.
                const version = semVerRegExp(line);
                // Skip lines without version string
                if (version && version.length > 0) {
                    const parts: Array<string> = line.replace('require', '').replace('(', '').replace(')', '').trim().split(' ');
                    const pkgName: string = (parts[0] || '').trim();
                    // Ignore line starting with replace clause and empty package
                    if (pkgName.length > 0) {
                        const entry: IKeyValueEntry = new KeyValueEntry(pkgName, { line: 0, column: 0 });
                        entry.value = new Variant(ValueType.String, 'v' + version[0]);
                        entry.value_position = { line: index + 1, column: version.index };
                        // Push all direct and indirect modules present in go.mod (manifest)
                        dependencies.push(new Dependency(entry));
                    }
                }
            }
            return dependencies;
        }, []);
        // apply replacement dependencies
        goModDeps = goModDeps.map(goModDep => NaiveGomodParser.applyReplaceMap(goModDep, replaceMap));

        // Return modules present in go.mod.
        return [...goModDeps];
    }

    parse(): Array<IDependency> {
        return this.dependencies;
    }
}

/* Process entries found in the go.mod file */
export class DependencyProvider implements IDependencyProvider {
    ecosystem: string;
    constructor(public classes: Array<string> = ['dependencies']) {
        this.ecosystem = 'golang';
    }

    async collect(contents: string): Promise<Array<IDependency>> {
        let parser = new NaiveGomodParser(contents);
        return parser.parse();
    }
}
