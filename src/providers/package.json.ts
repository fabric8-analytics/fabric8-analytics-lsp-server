'use strict';

import jsonAst from 'json-to-ast';
import { IKeyValueEntry, KeyValueEntry, Variant, ValueType, IDependency, IDependencyProvider, Dependency } from '../collector';

export class DependencyProvider implements IDependencyProvider {
    ecosystem: string;
    constructor(public classes: Array<string> = ['dependencies']) {
        this.ecosystem = 'npm';
    }

    async collect(contents: string): Promise<Array<IDependency>> {
      let ast: any;
      try {
          ast = jsonAst(contents || '{}');
      } catch (err) {
          // doesn't make any sense to throw syntax errors.
          if (err.name === 'SyntaxError') {
              return [];
          }
          throw err;
      }
      return ast.children.
              filter(c => this.classes.includes(c.key.value)).
              flatMap(c => c.value.children).
              map(c => {
                  const entry: IKeyValueEntry = new KeyValueEntry(c.key.value, {line: c.key.loc.start.line, column: c.key.loc.start.column + 1});
                  entry.value = new Variant(ValueType.String, c.value.value);
                  entry.valuePosition = {line: c.value.loc.start.line, column: c.value.loc.start.column + 1};
                  return new Dependency(entry);
              });
    }
}
