'use strict';

import { expect } from 'chai';
import { Dependency, IPosition, ValueType, Variant, KeyValueEntry, DependencyMap, SimpleDependency } from '../src/collector';

describe('Collector util test', () => {

  const pos: IPosition = {
    line: 123,
    column: 123
  }; 

  // define manifest dependencies
  const reqDeps: Array<Dependency> = [
    new Dependency(new KeyValueEntry('foo', pos, new Variant(ValueType.String, '1.0'), pos)),
    new Dependency(new KeyValueEntry('bar', pos, new Variant(ValueType.String, '2.0'), pos))
  ];

  // define api response dependencies
  const resDeps: Array<SimpleDependency> = [
    new SimpleDependency('foo', '1.0'),
    new SimpleDependency('bar', '2.0')
  ];

  it('create map', async () => {
    const map = new DependencyMap(reqDeps);
    expect(map.get(resDeps[0])).to.eql(reqDeps[0]);
    expect(map.get(resDeps[1])).to.eql(reqDeps[1]);
  });
})
