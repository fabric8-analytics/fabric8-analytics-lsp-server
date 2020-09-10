import { expect } from 'chai';
import { GomodDependencyCollector } from '../src/collector';

describe('Golang go.mod parser test', () => {
    const collector:GomodDependencyCollector = new GomodDependencyCollector();

    it('tests valid go.mod', async () => {
        const deps = await collector.collect(`
          module github.com/alecthomas/kingpin
          require (
            github.com/alecthomas/units v0.0.0-20151022065526-2efee857e7cf
            github.com/davecgh/go-spew v1.1.1 // indirect
            github.com/pmezard/go-difflib v1.0.0 // indirect
            github.com/stretchr/testify v1.2.2
          )
          go 1.13
        `);
        expect(deps.length).equal(4);
        expect(deps[0]).is.eql({
          name: {value: 'github.com/alecthomas/units', position: {line: 0, column: 0}},
          version: {value: '0.0.0-20151022065526-2efee857e7cf', position: {line: 4, column: 42}}
        });
        expect(deps[1]).is.eql({
          name: {value: 'github.com/davecgh/go-spew', position: {line: 0, column: 0}},
          version: {value: '1.1.1', position: {line: 5, column: 41}}
        });
        expect(deps[2]).is.eql({
          name: {value: 'github.com/pmezard/go-difflib', position: {line: 0, column: 0}},
          version: {value: '1.0.0', position: {line: 6, column: 44}}
        });
        expect(deps[3]).is.eql({
          name: {value: 'github.com/stretchr/testify', position: {line: 0, column: 0}},
          version: {value: '1.2.2', position: {line: 7, column: 42}}
        });
    });

    it('tests go.mod with comments', async () => {
        const deps = await collector.collect(`// This is start point.
          module github.com/alecthomas/kingpin
          require (
            github.com/alecthomas/units v0.0.0-20151022065526-2efee857e7cf // Valid data before this.
            // Extra comment in require section.
            github.com/pmezard/go-difflib v1.0.0 // indirect
            github.com/stretchr/testify v1.2.2
          )
          go 1.13
          // Final notes.
        `);
        expect(deps.length).equal(3);
        expect(deps[0]).is.eql({
          name: {value: 'github.com/alecthomas/units', position: {line: 0, column: 0}},
          version: {value: '0.0.0-20151022065526-2efee857e7cf', position: {line: 4, column: 42}}
        });
        expect(deps[1]).is.eql({
          name: {value: 'github.com/pmezard/go-difflib', position: {line: 0, column: 0}},
          version: {value: '1.0.0', position: {line: 6, column: 44}}
        });
        expect(deps[2]).is.eql({
          name: {value: 'github.com/stretchr/testify', position: {line: 0, column: 0}},
          version: {value: '1.2.2', position: {line: 7, column: 42}}
        });
    });

    it('tests empty lines in go.mod', async () => {
        const deps = await collector.collect(`
          module github.com/alecthomas/kingpin

          require (

            github.com/alecthomas/units v0.0.0-20151022065526-2efee857e7cf // Valid data before this.

            github.com/stretchr/testify v1.2.2

          )
          go 1.13

        `);
        expect(deps.length).equal(2);
        expect(deps[0]).is.eql({
          name: {value: 'github.com/alecthomas/units', position: {line: 0, column: 0}},
          version: {value: '0.0.0-20151022065526-2efee857e7cf', position: {line: 6, column: 42}}
        });
        expect(deps[1]).is.eql({
          name: {value: 'github.com/stretchr/testify', position: {line: 0, column: 0}},
          version: {value: '1.2.2', position: {line: 8, column: 42}}
        });
    });

    it('tests deps with spaces before and after comparators', async () => {
        const deps = await collector.collect(`
          module github.com/alecthomas/kingpin
          require (
            github.com/alecthomas/units    v0.0.0-20151022065526-2efee857e7cf
                github.com/davecgh/go-spew      v1.1.1 // indirect
              github.com/pmezard/go-difflib       v1.0.0    // indirect
             github.com/stretchr/testify    v1.2.2
          )
          go 1.13
        `);
        expect(deps.length).equal(4);
        expect(deps[0]).is.eql({
          name: {value: 'github.com/alecthomas/units', position: {line: 0, column: 0}},
          version: {value: '0.0.0-20151022065526-2efee857e7cf', position: {line: 4, column: 45}}
        });
        expect(deps[1]).is.eql({
          name: {value: 'github.com/davecgh/go-spew', position: {line: 0, column: 0}},
          version: {value: '1.1.1', position: {line: 5, column: 50}}
        });
        expect(deps[2]).is.eql({
          name: {value: 'github.com/pmezard/go-difflib', position: {line: 0, column: 0}},
          version: {value: '1.0.0', position: {line: 6, column: 52}}
        });
        expect(deps[3]).is.eql({
          name: {value: 'github.com/stretchr/testify', position: {line: 0, column: 0}},
          version: {value: '1.2.2', position: {line: 7, column: 46}}
        });
    });
});
