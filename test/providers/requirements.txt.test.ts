import { expect } from 'chai';
import { DependencyProvider } from '../../src/providers/requirements.txt';

describe('PyPi requirements.txt parser test', () => {
    const collector = new DependencyProvider();

    it('tests valid requirements.txt', async () => {
        const deps = await collector.collect(`a==1
            B==2.1.1
            c>=10.1
            d<=20.1.2.3.4.5.6.7.8
        `);
        expect(deps).is.eql([{
          name: {value: 'a', position: {line: 0, column: 0}},
          version: {value: '1', position: {line: 1, column: 4}}
        },{
          name: {value: 'b', position: {line: 0, column: 0}},
          version: {value: '2.1.1', position: {line: 2, column: 16}}
        },{
          name: {value: 'c', position: {line: 0, column: 0}},
          version: {value: '10.1', position: {line: 3, column: 16}}
        },{
          name: {value: 'd', position: {line: 0, column: 0}},
          version: {value: '20.1.2.3.4.5.6.7.8', position: {line: 4, column: 16}}
        }]);
    });

    it('tests requirements.txt with comments', async () => {
        const deps = await collector.collect(`# hello world
            a==1 # hello
            # another comment b==2.1.1
            c # yet another comment >=10.1
            d<=20.1.2.3.4.5.6.7.8
            # done
        `);
        expect(deps).is.eql([{
          name: {value: 'a', position: {line: 0, column: 0}},
          version: {value: '1', position: {line: 2, column: 16}}
        },{
          name: {value: 'c', position: {line: 0, column: 0}},
          version: {value: '', position: {line: 4, column: 1}} // column shouldn't matter for empty versions
        },{
          name: {value: 'd', position: {line: 0, column: 0}},
          version: {value: '20.1.2.3.4.5.6.7.8', position: {line: 5, column: 16}}
        }]);
    });

    it('tests empty requirements.txt', async () => {
        const deps = await collector.collect(``);
        expect(deps).is.eql([]);
    });

    it('tests empty lines', async () => {
        const deps = await collector.collect(`

            a==1

        `);
        expect(deps).is.eql([{
          name: {value: 'a', position: {line: 0, column: 0}},
          version: {value: '1', position: {line: 3, column: 16}}
        }]);
    });

    it('tests deps with spaces before and after comparators', async () => {
        const deps = await collector.collect(`
            a        ==1               

                  b        <=     10.1               

        `);
        expect(deps).is.eql([{
          name: {value: 'a', position: {line: 0, column: 0}},
          version: {value: '1', position: {line: 2, column: 24}}
        },{
          name: {value: 'b', position: {line: 0, column: 0}},
          version: {value: '10.1', position: {line: 4, column: 35}}
        }]);
    });
});
