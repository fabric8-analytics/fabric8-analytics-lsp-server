'use strict';

import { expect } from 'chai';
import { Dependency, IPosition, ValueType, Variant, KeyValueEntry, DependencyMap } from '../src/collector';

describe('Collector util test', () => {

  const pos: IPosition = {
    line: 123,
    column: 123
  }; 

  // define manifest dependencies
  const reqDeps: Array<Dependency> = [
    new Dependency(new KeyValueEntry('mockGtoup1/mockArtifact1', pos, new Variant(ValueType.String, 'mockVersion1'), pos)),
    new Dependency(new KeyValueEntry('mockGtoup2/mockArtifact2', pos, new Variant(ValueType.String, 'mockVersion2'), pos))
  ];

  // define api response dependencies
  const resDeps: any[] = [
    { ref: 'pkg:maven/mockGtoup1/mockArtifact1@mockVersion1' },
    { ref: 'pkg:maven/mockGtoup2/mockArtifact2@mockVersion2' }
  ];

  it('create map for maven dependecies', async () => {
    const ecosystem = 'maven';
    const map = new DependencyMap(reqDeps);
    expect(map.get(resDeps[0].ref.replace(`pkg:${ecosystem}/`, ''))).to.eql(reqDeps[0]);
    expect(map.get(resDeps[1].ref.replace(`pkg:${ecosystem}/`, ''))).to.eql(reqDeps[1]);
  });
})
