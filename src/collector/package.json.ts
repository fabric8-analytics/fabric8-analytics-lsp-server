'use strict';

import jsonAst from 'json-to-ast';
import { IKeyValueEntry, KeyValueEntry, Variant, ValueType, IDependency, IDependencyCollector, Dependency } from '../collector';

export class DependencyCollector implements IDependencyCollector {
    constructor(public classes: Array<string> = ['dependencies']) {}

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
                  let entry: IKeyValueEntry = new KeyValueEntry(c.key.value, {line: c.key.loc.start.line, column: c.key.loc.start.column + 1});
                  entry.value = new Variant(ValueType.String, c.value.value);
                  entry.value_position = {line: c.value.loc.start.line, column: c.value.loc.start.column + 1};
                  return new Dependency(entry);
              });
    }
}
