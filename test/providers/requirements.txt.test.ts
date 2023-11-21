'use strict';

import { expect } from 'chai';
import { DependencyProvider } from '../../src/providers/requirements.txt';

describe('Python PyPi requirements.txt parser test', () => {
    let dependencyProvider: DependencyProvider;

    beforeEach(() => {
        dependencyProvider = new DependencyProvider();
    });

    it('tests empty requirements.txt', async () => {
        const deps = await dependencyProvider.collect(``);
        expect(deps).is.eql([]);
    });

    it('tests valid requirements.txt', async () => {
        const deps = await dependencyProvider.collect(`
            a==1
            B==2.1.1
            c>=10.1
            d<=20.1.2.3.4.5.6.7.8
        `);
        expect(deps).is.eql([
            {
                name: {value: 'a', position: {line: 0, column: 0}},
                version: {value: '1', position: {line: 2, column: 16}}
            },
            {
                name: {value: 'b', position: {line: 0, column: 0}},
                version: {value: '2.1.1', position: {line: 3, column: 16}}
            },
            {
                name: {value: 'c', position: {line: 0, column: 0}},
                version: {value: '10.1', position: {line: 4, column: 16}}
            },
            {
                name: {value: 'd', position: {line: 0, column: 0}},
                version: {value: '20.1.2.3.4.5.6.7.8', position: {line: 5, column: 16}}
            }
        ]);
    });

    it('tests requirements.txt with comments', async () => {
        const deps = await dependencyProvider.collect(`
            # hello world
            a==1 # hello
            # invalid line b==2.1.1
            c # invalid line >=10.1
            d<=20.1.2.3.4.5.6.7.8
            # done
        `);
        expect(deps).is.eql([
            {
                name: {value: 'a', position: {line: 0, column: 0}},
                version: {value: '1', position: {line: 3, column: 16}}
            },
            {
                name: {value: 'd', position: {line: 0, column: 0}},
                version: {value: '20.1.2.3.4.5.6.7.8', position: {line: 6, column: 16}}
            }
        ]);
    });

    it('tests empty lines', async () => {
        const deps = await dependencyProvider.collect(`

            a==1

        `);
        expect(deps).is.eql([
            {
                name: {value: 'a', position: {line: 0, column: 0}},
                version: {value: '1', position: {line: 3, column: 16}}
            }
        ]);
    });

    it('tests deps with spaces before and after comparators', async () => {
        const deps = await dependencyProvider.collect(`
            a        ==1               

                b        <=     10.1               

        `);
        expect(deps).is.eql([
            {
                name: {value: 'a', position: {line: 0, column: 0}},
                version: {value: '1', position: {line: 2, column: 24}}
            },
            {
                name: {value: 'b', position: {line: 0, column: 0}},
                version: {value: '10.1', position: {line: 4, column: 33}}
            }
        ]);
    });
});
