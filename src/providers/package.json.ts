'use strict';

import jsonAst from 'json-to-ast';
import { IDependencyProvider, EcosystemDependencyResolver, IDependency, Dependency } from '../collector';

export class DependencyProvider extends EcosystemDependencyResolver implements IDependencyProvider {
    private classes: string[] = ['dependencies'];

    constructor() {
        super('npm'); // set ecosystem to 'npm'
    }

    private parseJson(contents: string): jsonAst {
        return jsonAst(contents || '{}');
    }

    private mapDependencies(jsonAst: jsonAst): IDependency[] {
        return jsonAst.children
                .filter(c => this.classes.includes(c.key.value))
                .flatMap(c => c.value.children)
                .map(c => {
                    return new Dependency(
                        { value: c.key.value, position: {line: c.key.loc.start.line, column: c.key.loc.start.column + 1} },
                        { value: c.value.value, position: {line: c.value.loc.start.line, column: c.value.loc.start.column + 1} },
                    );
                });
    }

    async collect(contents: string): Promise<IDependency[]> {
        try {
            const jsonAst: jsonAst = this.parseJson(contents);
            return this.mapDependencies(jsonAst);
        } catch (err) {
            if (err instanceof SyntaxError) {
                return [];
            }
            throw err;
        }
    }
}
