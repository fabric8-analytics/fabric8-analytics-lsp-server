import { expect } from 'chai';
import { ReqDependencyCollector } from '../src/collector';

describe('PyPi requirements.txt parser test', () => {
    const collector:ReqDependencyCollector = new ReqDependencyCollector();

    it('tests valid requirements.txt', async () => {
        const deps = await collector.collect(`a==1
            b==2.1.1
            c>=10.1
            d<=20.1.2.3.4.5.6.7.8
        `);
        expect(deps.length).equal(4);
        expect(deps[0]).is.eql({
          name: {value: 'a', position: {line: 0, column: 0}},
          version: {value: '1', position: {line: 1, column: 4}},
          parent: null,
        });
        expect(deps[1]).is.eql({
          name: {value: 'b', position: {line: 0, column: 0}},
          version: {value: '2.1.1', position: {line: 2, column: 16}},
          parent: null,
        });
        expect(deps[2]).is.eql({
          name: {value: 'c', position: {line: 0, column: 0}},
          version: {value: '10.1', position: {line: 3, column: 16}},
          parent: null,
        });
        expect(deps[3]).is.eql({
          name: {value: 'd', position: {line: 0, column: 0}},
          version: {value: '20.1.2.3.4.5.6.7.8', position: {line: 4, column: 16}},
          parent: null,
        });
    });

    it('tests requirements.txt with comments', async () => {
        const deps = await collector.collect(`# hello world
            a==1 # hello
            # another comment b==2.1.1
            c # yet another comment >=10.1
            d<=20.1.2.3.4.5.6.7.8
            # done
        `);
        expect(deps.length).equal(3);
        expect(deps[0]).is.eql({
          name: {value: 'a', position: {line: 0, column: 0}},
          version: {value: '1', position: {line: 2, column: 16}},
          parent: null,
        });
        expect(deps[1]).is.eql({
          name: {value: 'c', position: {line: 0, column: 0}},
          version: {value: '', position: {line: 4, column: 1}}, // column shouldn't matter for empty versions
          parent: null,
        });
        expect(deps[2]).is.eql({
          name: {value: 'd', position: {line: 0, column: 0}},
          version: {value: '20.1.2.3.4.5.6.7.8', position: {line: 5, column: 16}},
          parent: null,
        });
    });

    it('tests empty lines', async () => {
        const deps = await collector.collect(`

            a==1

        `);
        expect(deps.length).equal(1);
        expect(deps[0]).is.eql({
          name: {value: 'a', position: {line: 0, column: 0}},
          version: {value: '1', position: {line: 3, column: 16}},
          parent: null,
        });
    });

    it('tests deps with spaces before and after comparators', async () => {
        const deps = await collector.collect(`
            a        ==1               

                  b        <=     10.1               

        `);
        expect(deps.length).equal(2);
        expect(deps[0]).is.eql({
          name: {value: 'a', position: {line: 0, column: 0}},
          version: {value: '1', position: {line: 2, column: 24}},
          parent: null,
        });
        expect(deps[1]).is.eql({
          name: {value: 'b', position: {line: 0, column: 0}},
          version: {value: '10.1', position: {line: 4, column: 35}},
          parent: null,
        });
    });
});
