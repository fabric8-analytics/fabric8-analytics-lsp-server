'use strict';

import { IDependencyProvider, EcosystemDependencyResolver, IDependency, Dependency } from '../collector';

/* Process entries found in the txt files and collect all dependency
 * related information */
export class DependencyProvider extends EcosystemDependencyResolver implements IDependencyProvider {
    
    constructor() {
        super('pypi'); // set ecosystem to 'pypi'
    }

    private parseTxtDoc(contents: string): string[] {
        return contents.split('\n');
    }

    private parseLine(line: string, index: number): IDependency | null {
        line = line.split('#')[0].trim(); // Remove comments
        if (!line) return null; // Skip empty lines

        const lineData: string[]  = line.split(/[==,>=,<=]+/);
        if (lineData.length !== 2) return null; // Skip invalid lines

        const depName: string = lineData[0].trim().toLowerCase();
        const depVersion: string = lineData[1].trim();

        return new Dependency(
            { value: depName, position: { line: 0, column: 0 } },
            { value: depVersion, position: { line: index + 1, column: line.indexOf(depVersion) + 1 } },
        );
    }

    private extractDependenciesFromLines(lines: string[]): IDependency[] {
        return lines.reduce((dependencies: IDependency[], line: string, index: number) => {
            const parsedDependency = this.parseLine(line, index);
            if (parsedDependency) {
                dependencies.push(parsedDependency);
            }
            return dependencies;
        }, []);
    }

    async collect(contents: string): Promise<IDependency[]> {
        const lines: string[] = this.parseTxtDoc(contents);
        return this.extractDependenciesFromLines(lines);
    }
}
