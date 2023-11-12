'use strict';

import { IDependencyProvider, EcosystemDependencyResolver, IDependency, Dependency } from '../collector';
import { semVerRegExp } from '../utils'

/* Process entries found in the go.mod file */
export class DependencyProvider extends EcosystemDependencyResolver implements IDependencyProvider {
    replacementMap: Map<string, IDependency> = new Map<string, IDependency>();
    
    constructor() {
        super('golang'); // set ecosystem to 'golang'
    }

    static parseTxtDoc(contents: string): string[] {
        return contents.split('\n');
    }

    static clean(line: string): string {
        return line.replace(/require|replace|\(|\)/g, '')
        .replace(/\s+/g, ' ')
        .trim();
    }
    
    static getDependencyData(line: string): { name: string, version: string, index: number } | null  {
        const versionMatches: RegExpExecArray = semVerRegExp(line);
        if (versionMatches && versionMatches.length > 0) {
            const depName = DependencyProvider.clean(line).split(' ')[0];
            return {name: depName, version: versionMatches[0], index: versionMatches.index}
        }
        return null;
    }

    private registerReplacement(line: string, index: number) {
        // split the replace statements by '=>'
        const lineData: string[] = line.split('=>');
        if (lineData.length !== 2) return;

        let originalDepData = DependencyProvider.getDependencyData(lineData[0]);
        const replacementDepData = DependencyProvider.getDependencyData(lineData[1]);

        if (!originalDepData) originalDepData = {name: DependencyProvider.clean(lineData[0]), version: null, index: null}
        if (!replacementDepData) return;

        const replaceDependency = new Dependency(
            { value: replacementDepData.name, position: { line: 0, column: 0 } },
            { value: 'v' + replacementDepData.version, position: { line: index + 1, column: (line.lastIndexOf(lineData[1]) + replacementDepData.index) } },
        );

        this.replacementMap.set(originalDepData.name + (originalDepData.version ? ('@v' + originalDepData.version) : ''), replaceDependency); 
    }

    private parseLine(line: string, index: number): IDependency | null {

        line = line.split('//')[0]; // Remove comments
        if (!DependencyProvider.clean(line)) return null; // Skip lines without dependencies

        if (line.includes('=>')) {
            // stash replacement dependencies for replacement
            this.registerReplacement(line, index);
            return null;
        }

        const depData = DependencyProvider.getDependencyData(line);
        if (!depData) return null;

        return new Dependency(
            { value: depData.name, position: { line: 0, column: 0 } },
            { value: 'v' + depData.version, position: { line: index + 1, column: depData.index } },
        );
    }

    private  applyReplaceMap(dep: IDependency): IDependency {
        return this.replacementMap.get(dep.name.value + '@' + dep.version.value) || this.replacementMap.get(dep.name.value) || dep;
    }

    private extractDependenciesFromLines(lines :string[]): IDependency[] {
        let isExcluded: boolean = false;
        const goModDeps: IDependency[] = lines.reduce((dependencies: IDependency[], line: string, index: number) => {
            
            // ignore excluded dependency lines and scopes
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

            // parse included lines for dependencies
            const parsedDependency: IDependency = this.parseLine(line, index);
            if (parsedDependency) {
                dependencies.push(parsedDependency);
            }

            return dependencies;

        }, []);

        // apply replacement dependencies
        return goModDeps.map(goModDep => this.applyReplaceMap(goModDep));
    }

    async collect(contents: string): Promise<IDependency[]> {
        const lines: string[] = DependencyProvider.parseTxtDoc(contents);
        return this.extractDependenciesFromLines(lines);
    }
}
