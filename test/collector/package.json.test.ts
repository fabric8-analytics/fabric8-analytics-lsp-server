import { expect } from 'chai';
import { DependencyCollector } from '../../src/collector/package.json';

describe('npm package.json parser test', () => {
    const collector = new DependencyCollector();

    it('tests empty package.json file content', async () => {
        const deps = await collector.collect(``);
        expect(deps.length).equal(0);
    });

    it('tests empty package.json', async () => {
        const deps = await collector.collect(`
        {}
        `);
        expect(deps.length).equal(0);
    });

    it('tests empty dependencies key', async () => {
        const deps = await collector.collect(`
        {
          "hello":[],
          "dependencies": {}
        }
        `);
        expect(deps.length).equal(0);
    });

    it('tests single dependency ', async () => {
        const deps = await collector.collect(`{
          "hello":{},
          "dependencies": {
            "hello": "1.0"
          }
        }`);
        expect(deps).is.eql([{
          name: {value: "hello", position: {line: 4, column: 14}},
          version: {value: "1.0", position: {line: 4, column: 23}}
        }]);
    });

    it('tests single dependency as devDependencies', async () => {
        let collector = new DependencyCollector(["devDependencies"]);
        let deps = await collector.collect(`{
          "devDependencies": {
            "hello": "1.0"
          },
          "dependencies": {
            "foo": "10.1.1"
          }
        }`);
        expect(deps).is.eql([{
          name: {value: "hello", position: {line: 3, column: 14}},
          version: {value: "1.0", position: {line: 3, column: 23}}
        }]);

        collector = new DependencyCollector(["devDependencies", "dependencies"]);
        deps = await collector.collect(`{
          "devDependencies": {
            "hello": "1.0"
          },
          "dependencies": {
            "foo": "10.1.1"
          }
        }`);
        expect(deps).is.eql([{
          name: {value: "hello", position: {line: 3, column: 14}},
          version: {value: "1.0", position: {line: 3, column: 23}}
        },{
          name: {value: "foo", position: {line: 6, column: 14}},
          version: {value: "10.1.1", position: {line: 6, column: 21}}
        }]);
    });


    it('tests single dependency with version in next line', async () => {
        const deps = await collector.collect(`{
          "hello":{},
          "dependencies": {
            "hello":
              "1.0"
          }
        }`);
        expect(deps).is.eql([{
          name: {value: "hello", position: {line: 4, column: 14}},
          version: {value: "1.0", position: {line: 5, column: 16}}
        }]);
    });

    it('tests 3 dependencies with spaces', async () => {
        const deps = await collector.collect(`{
          "hello":{},
          "dependencies": {
           "hello":                "1.0",
              "world":"^1.0",


        "foo":

          "     10.0.1"
          }
        }`);
        expect(deps).is.eql([{
          name: {value: "hello", position: {line: 4, column: 13}},
          version: {value: "1.0", position: {line: 4, column: 37}}
        },{
          name: {value: "world", position: {line: 5, column: 16}},
          version: {value: "^1.0", position: {line: 5, column: 24}}
        },{
          name: {value: "foo", position: {line: 8, column: 10}},
          version: {value: "     10.0.1", position: {line: 10, column: 12}}
        }]);
    });
});
