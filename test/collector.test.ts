'use strict';

import { expect } from 'chai';
import { DependencyMap, SimpleDependency } from '../src/collector';

describe('Collector util test', () => {

  const deps: Array<SimpleDependency> = [
    new SimpleDependency('foo', '1.0'),
    new SimpleDependency('bar', '2.0')
  ];

  it('create map', async () => {
    const map = new DependencyMap(deps);
    expect(map.get(deps[0])).to.eql(deps[0]);
    expect(map.get(deps[1])).to.eql(deps[1]);
  });
})
