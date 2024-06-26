/* --------------------------------------------------------------------------------------------
 * Copyright (c) Red Hat
 * Licensed under the Apache-2.0 License. See License.txt in the project root for license information.
 * ------------------------------------------------------------------------------------------ */
'use strict';

import jsonAst from 'json-to-ast';
import { IDependencyProvider, EcosystemDependencyResolver, IDependency, Dependency } from '../dependencyAnalysis/collector';
import { NPM } from '../constants';

/**
 * Process entries found in the package.json file.
 */
export class DependencyProvider extends EcosystemDependencyResolver implements IDependencyProvider {
    classes: string[] = ['dependencies'];

    constructor() {
        super(NPM); // set ecosystem to 'npm'
    }

    /**
     * Parses the provided manifest content into a JSON AST.
     * @param contents - The manifest content to parse.
     * @returns The parsed JSON AST.
     */
    private parseJson(contents: string): jsonAst {
        return jsonAst(contents || '{}');
    }

    /**
     * Maps dependencies from the parsed JSON AST to IDependency objects.
     * @param jsonAst - The parsed JSON AST to map dependencies from.
     * @returns An array of IDependency objects representing the dependencies.
     */
    private mapDependencies(ast: jsonAst): IDependency[] {
        return ast.children
                .filter(c => this.classes.includes(c.key.value))
                .flatMap(c => c.value.children)
                .map(c => {
                    const dep = new Dependency({ value: c.key.value, position: {line: c.key.loc.start.line, column: c.key.loc.start.column + 1} });
                    dep.version = { value: c.value.value, position: {line: c.value.loc.start.line, column: c.value.loc.start.column + 1} };
                    return dep;
                });
    }

    /**
     * Collects dependencies from the provided manifest contents.
     * @param contents - The manifest content to collect dependencies from.
     * @returns A Promise resolving to an array of IDependency objects representing collected dependencies.
     */
    async collect(contents: string): Promise<IDependency[]> {
        let ast: jsonAst;
        
        try {
            ast = this.parseJson(contents);
        } catch (err) {
            if (err instanceof SyntaxError) {
                return [];
            }
            throw err;
        }

        return this.mapDependencies(ast);
    }
}
