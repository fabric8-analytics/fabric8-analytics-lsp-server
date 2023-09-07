'use strict';

import { IKeyValueEntry, KeyValueEntry, Variant, ValueType, IDependency, IDependencyCollector, Dependency } from '../collector';

class NaivePyParser {
    constructor(contents: string) {
        this.dependencies = NaivePyParser.parseDependencies(contents);
    }

    dependencies: Array<IDependency>;

    static parseDependencies(contents:string): Array<IDependency> {
        const requirements = contents.split('\n');
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
export class DependencyCollector implements IDependencyCollector {
    constructor(public classes: Array<string> = ['dependencies']) {}

    async collect(contents: string): Promise<Array<IDependency>> {
        let parser = new NaivePyParser(contents);
        return parser.parse();
    }

}
