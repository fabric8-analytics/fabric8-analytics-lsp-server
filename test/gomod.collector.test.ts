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
            github.com/pmezard/go-difflib v1.0.0
            github.com/stretchr/testify v1.2.2
          )
          go 1.13
        `);
        expect(deps.length).equal(4);
        expect(deps[0]).is.eql({
          name: {value: 'github.com/alecthomas/units', position: {line: 0, column: 0}},
          version: {value: 'v0.0.0-20151022065526-2efee857e7cf', position: {line: 4, column: 41}},
        });
        expect(deps[1]).is.eql({
          name: {value: 'github.com/davecgh/go-spew', position: {line: 0, column: 0}},
          version: {value: 'v1.1.1', position: {line: 5, column: 40}},
        });
        expect(deps[2]).is.eql({
          name: {value: 'github.com/pmezard/go-difflib', position: {line: 0, column: 0}},
          version: {value: 'v1.0.0', position: {line: 6, column: 43}},
        });
        expect(deps[3]).is.eql({
          name: {value: 'github.com/stretchr/testify', position: {line: 0, column: 0}},
          version: {value: 'v1.2.2', position: {line: 7, column: 41}},
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
          version: {value: 'v0.0.0-20151022065526-2efee857e7cf', position: {line: 4, column: 41}},
        });
        expect(deps[1]).is.eql({
          name: {value: 'github.com/pmezard/go-difflib', position: {line: 0, column: 0}},
          version: {value: 'v1.0.0', position: {line: 6, column: 43}},
        });
        expect(deps[2]).is.eql({
          name: {value: 'github.com/stretchr/testify', position: {line: 0, column: 0}},
          version: {value: 'v1.2.2', position: {line: 7, column: 41}},
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
          version: {value: 'v0.0.0-20151022065526-2efee857e7cf', position: {line: 6, column: 41}},
        });
        expect(deps[1]).is.eql({
          name: {value: 'github.com/stretchr/testify', position: {line: 0, column: 0}},
          version: {value: 'v1.2.2', position: {line: 8, column: 41}},
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
          version: {value: 'v0.0.0-20151022065526-2efee857e7cf', position: {line: 4, column: 44}},
        });
        expect(deps[1]).is.eql({
          name: {value: 'github.com/davecgh/go-spew', position: {line: 0, column: 0}},
          version: {value: 'v1.1.1', position: {line: 5, column: 49}},
        });
        expect(deps[2]).is.eql({
          name: {value: 'github.com/pmezard/go-difflib', position: {line: 0, column: 0}},
          version: {value: 'v1.0.0', position: {line: 6, column: 39}},
        });
        expect(deps[3]).is.eql({
          name: {value: 'github.com/stretchr/testify', position: {line: 0, column: 0}},
          version: {value: 'v1.2.2', position: {line: 7, column: 37}},
        });
    });
    
    it('tests alpha beta and extra for version in go.mod', async () => {
      const deps = await collector.collect(`
        module github.com/alecthomas/kingpin

        require (
          github.com/alecthomas/units v0.1.3-alpha
          github.com/pierrec/lz4 v2.5.2-alpha+incompatible
          github.com/davecgh/go-spew v1.1.1+incompatible
          github.com/pmezard/go-difflib v1.3.0+version
          github.com/stretchr/testify v1.2.2+incompatible-version
          github.com/regen-network/protobuf v1.3.2-alpha.regen.4
          github.com/vmihailenco/msgpack/v5 v5.0.0-beta.1
          github.com/btcsuite/btcd v0.20.1-beta
        )
        
        go 1.13
      `);
      expect(deps.length).equal(8);
      expect(deps[0]).is.eql({
        name: {value: 'github.com/alecthomas/units', position: {line: 0, column: 0}},
        version: {value: 'v0.1.3-alpha', position: {line: 5, column: 39}},
      });
      expect(deps[1]).is.eql({
        name: {value: 'github.com/pierrec/lz4', position: {line: 0, column: 0}},
        version: {value: 'v2.5.2-alpha+incompatible', position: {line: 6, column: 34}},
      });
      expect(deps[2]).is.eql({
        name: {value: 'github.com/davecgh/go-spew', position: {line: 0, column: 0}},
        version: {value: 'v1.1.1+incompatible', position: {line: 7, column: 38}},
      });
      expect(deps[3]).is.eql({
        name: {value: 'github.com/pmezard/go-difflib', position: {line: 0, column: 0}},
        version: {value: 'v1.3.0+version', position: {line: 8, column: 41}},
      });
      expect(deps[4]).is.eql({
        name: {value: 'github.com/stretchr/testify', position: {line: 0, column: 0}},
        version: {value: 'v1.2.2+incompatible-version', position: {line: 9, column: 39}},
      });
      expect(deps[5]).is.eql({
        name: {value: 'github.com/regen-network/protobuf', position: {line: 0, column: 0}},
        version: {value: 'v1.3.2-alpha.regen.4', position: {line: 10, column: 45}},
      });
      expect(deps[6]).is.eql({
        name: {value: 'github.com/vmihailenco/msgpack/v5', position: {line: 0, column: 0}},
        version: {value: 'v5.0.0-beta.1', position: {line: 11, column: 45}},
      });
      expect(deps[7]).is.eql({
        name: {value: 'github.com/btcsuite/btcd', position: {line: 0, column: 0}},
        version: {value: 'v0.20.1-beta', position: {line: 12, column: 36}},
      });
    });
    
    it('tests replace statements in go.mod', async () => {
      const deps = await collector.collect(`
        module github.com/alecthomas/kingpin
        go 1.13
        require (
          github.com/alecthomas/units v0.1.3-alpha
          github.com/pierrec/lz4 v2.5.2-alpha+incompatible
        )
        
        replace (
          github.com/alecthomas/units => github.com/test-user/units v13.3.2 // Required by OLM
          github.com/pierrec/lz4 => github.com/pierrec/lz4 v3.4.2 // Required by prometheus-operator
        )
      `);
      expect(deps.length).equal(2);
      expect(deps[0]).is.eql({
        name: {value: 'github.com/alecthomas/units', position: {line: 0, column: 0}},
        version: {value: 'v0.1.3-alpha', position: {line: 5, column: 39}},
      });
      expect(deps[1]).is.eql({
        name: {value: 'github.com/pierrec/lz4', position: {line: 0, column: 0}},
        version: {value: 'v2.5.2-alpha+incompatible', position: {line: 6, column: 34}},
      });
    });
    
    it('tests single line replace statement in go.mod', async () => {
      const deps = await collector.collect(`
        module github.com/alecthomas/kingpin
        go 1.13
        require (
          github.com/alecthomas/units v0.1.3-alpha
          github.com/pierrec/lz4 v2.5.2-alpha+incompatible
        )
        
        replace github.com/alecthomas/units => github.com/test-user/units v13.3.2
      `);
      expect(deps.length).equal(2);
      expect(deps[0]).is.eql({
        name: {value: 'github.com/alecthomas/units', position: {line: 0, column: 0}},
        version: {value: 'v0.1.3-alpha', position: {line: 5, column: 39}},
      });
      expect(deps[1]).is.eql({
        name: {value: 'github.com/pierrec/lz4', position: {line: 0, column: 0}},
        version: {value: 'v2.5.2-alpha+incompatible', position: {line: 6, column: 34}},
      });
    });

    it('test single line require statement in go.mod', async () => {
      const deps = await collector.collect(`
        module github.com/alecthomas/kingpin
        go 1.13
        require github.com/alecthomas/units v0.1.3-alpha
	require github.com/pierrec/lz4 v2.5.2
      `);
      expect(deps.length).equal(2);
      expect(deps[0]).is.eql({
        name: {value: 'github.com/alecthomas/units', position: {line: 0, column: 0}},
        version: {value: 'v0.1.3-alpha', position: {line: 4, column: 45}},
      });
      expect(deps[1]).is.eql({
        name: {value: 'github.com/pierrec/lz4', position: {line: 0, column: 0}},
        version: {value: 'v2.5.2', position: {line: 5, column: 33}},
      });
    });

    it('test single require statement with braces in go.mod', async () => {
      const deps = await collector.collect(`
        module github.com/alecthomas/kingpin
        go 1.13
        require ( github.com/alecthomas/units v0.1.3 )
      `);
      expect(deps.length).equal(1);
      expect(deps[0]).is.eql({
        name: {value: 'github.com/alecthomas/units', position: {line: 0, column: 0}},
        version: {value: 'v0.1.3', position: {line: 4, column: 47}},
      });
    });
});
