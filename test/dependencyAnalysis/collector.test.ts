'use strict';

import { expect } from 'chai';

import { Dependency, DependencyMap, getRange } from '../../src/dependencyAnalysis/collector';
import { DependencyProvider } from '../../src/providers/pom.xml';

describe('Dependency Analysis Collector tests', () => {

    // Mock manifest dependency collection
    const reqDeps: Dependency[] = [
        new Dependency ({ value: 'mockGroupId1/mockArtifact1', position: { line: 0, column: 0 } }),
        new Dependency ({ value: 'mockGroupId2/mockArtifact2', position: { line: 0, column: 0 } })
    ];

    it('should create map of dependecies', async () => {

        const depMap = new DependencyMap(reqDeps);

        expect(Object.fromEntries(depMap.mapper)).to.eql({
            'mockGroupId1/mockArtifact1': reqDeps[0],
            'mockGroupId2/mockArtifact2': reqDeps[1]
        });
    });

    it('should create empty dependency map', async () => {

        const depMap = new DependencyMap([]);

        expect(Object.keys(depMap.mapper).length).to.eql(0);
    });

    it('should get dependency from dependency map', async () => {

        const depMap = new DependencyMap(reqDeps);

        expect(depMap.get(reqDeps[0].name.value)).to.eq(reqDeps[0]);
        expect(depMap.get(reqDeps[1].name.value)).to.eq(reqDeps[1]);
    });

    it('should return dependency range', async () => {

        reqDeps[0].version = { value: 'mockVersion', position: { line: 123, column: 123 } };
        reqDeps[1].context = { value: 'mockRange', range: {
                start: { line: 123, character: 123 },
                end: { line: 456, character: 456 }
            },
        };

        expect(getRange(reqDeps[0])).to.eql(
            {
                start: { line: 122, character: 122 },
                end: { line: 122, character: 133 }
            }
        );

        expect(getRange(reqDeps[1])).to.eql(reqDeps[1].context.range);
    });

    it('should resolves a dependency reference in a specified ecosystem to its name and version string', async () => {
        const mavenDependencyProvider = new DependencyProvider();

        const resolvedRef = mavenDependencyProvider.resolveDependencyFromReference('pkg:maven/mockGroupId1/mockArtifact1@mockVersion1');

        expect(resolvedRef).to.eq('mockGroupId1/mockArtifact1@mockVersion1');
    });
})
