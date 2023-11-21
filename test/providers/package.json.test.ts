'use strict';

import { expect } from 'chai';
import * as sinon from 'sinon';
import { DependencyProvider } from '../../src/providers/package.json';

describe('Javascript NPM package.json parser test', () => {
    let dependencyProvider: DependencyProvider;

    beforeEach(() => {
        dependencyProvider = new DependencyProvider();
    });

    it('tests empty package.json file content', async () => {
        const deps = await dependencyProvider.collect(``);
        expect(deps.length).equal(0);
    });

    it('tests empty package.json', async () => {
        const deps = await dependencyProvider.collect(`{}`);
        expect(deps.length).equal(0);
    });

    it('tests invalid token package.json', async () => {
        const deps = await dependencyProvider.collect(`
            {
                <<<<<
                "dependencies": {
                    "hello": "1.0",
                }
            }
        `);
        expect(deps).eql([]);
    });

    it('tests invalid package.json', async () => {
        const deps = await dependencyProvider.collect(`
            {
                "dependencies": {
                    "hello": "1.0",
                }
            }
        `);
        expect(deps).eql([]);
    });

    it('tests empty dependencies key', async () => {
        const deps = await dependencyProvider.collect(`
            {
                "hello":[],
                "dependencies": {}
            }
        `);
        expect(deps).eql([]);
    });

    it('tests single dependency ', async () => {
        const deps = await dependencyProvider.collect(`
            {
                "hello":{},
                "dependencies": {
                    "hello": "1.0"
                }
            }
        `);
        expect(deps).is.eql([
            {
                name: {value: "hello", position: {line: 5, column: 22}},
                version: {value: "1.0", position: {line: 5, column: 31}}
            }
        ]);
    });

    it('tests dependency in devDependencies class', async () => {
        dependencyProvider.classes = ["devDependencies"];
        let deps = await dependencyProvider.collect(`
            {
                "devDependencies": {
                    "hello": "1.0"
                },
                "dependencies": {
                    "foo": "10.1.1"
                }
            }
        `);
        expect(deps).is.eql([
            {
                name: {value: "hello", position: {line: 4, column: 22}},
                version: {value: "1.0", position: {line: 4, column: 31}}
            }
        ]);
    });

    it('tests dependency in multiple classes', async () => {
        dependencyProvider.classes = ["devDependencies", "dependencies"];
        let deps = await dependencyProvider.collect(`
            {
                "devDependencies": {
                    "hello": "1.0"
                },
                "dependencies": {
                    "foo": "10.1.1"
                }
            }
        `);
        expect(deps).is.eql([
            {
                name: {value: "hello", position: {line: 4, column: 22}},
                version: {value: "1.0", position: {line: 4, column: 31}}
            },
            {
                name: {value: "foo", position: {line: 7, column: 22}},
                version: {value: "10.1.1", position: {line: 7, column: 29}}
            }
        ]);
    });


    it('tests dependency with version in next line', async () => {
        const deps = await dependencyProvider.collect(`
            {
                "hello":{},
                "dependencies": {
                    "hello":
                    "1.0"
                }
            }
        `);
        expect(deps).is.eql([
            {
                name: {value: "hello", position: {line: 5, column: 22}},
                version: {value: "1.0", position: {line: 6, column: 22}}
            }
        ]);
    });

    it('tests 3 dependencies with spaces', async () => {
        const deps = await dependencyProvider.collect(`
            {
                "hello":{},
                "dependencies": {
                "hello":                "1.0",
                    "world":"^1.0",


                "foo":

                "     10.0.1"
                }
            }
        `);
        expect(deps).is.eql([
            {
                name: {value: "hello", position: {line: 5, column: 18}},
                version: {value: "1.0", position: {line: 5, column: 42}}
            }, 
            {
                name: {value: "world", position: {line: 6, column: 22}},
                version: {value: "^1.0", position: {line: 6, column: 30}}
            },
            {
                name: {value: "foo", position: {line: 9, column: 18}},
                version: {value: "     10.0.1", position: {line: 11, column: 18}}
            }
        ]);
    });

    it('should throw an error for invalid JSON content', async () => {
        sinon.stub(dependencyProvider, 'parseJson').throws(new Error('Mock error message'));
        
        try {
            await dependencyProvider.collect(``);
            throw new Error('Expected an error to be thrown');
        } catch (error) {
            expect(error).to.be.an.instanceOf(Error);
            expect(error.message).to.equal('Mock error message');
        }
    });
});
