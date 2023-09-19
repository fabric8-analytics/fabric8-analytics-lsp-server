import { expect } from 'chai';
import { DependencyProvider } from '../../src/providers/go.mod';

const fake = require('fake-exec');

describe('Golang go.mod parser test', () => {
  const provider = new DependencyProvider();

  it('tests valid go.mod', async () => {
    const deps = await provider.collect(`
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
      name: { value: 'github.com/alecthomas/units', position: { line: 0, column: 0 } },
      version: { value: 'v0.0.0-20151022065526-2efee857e7cf', position: { line: 4, column: 41 } }
    });
    expect(deps[1]).is.eql({
      name: { value: 'github.com/davecgh/go-spew', position: { line: 0, column: 0 } },
      version: { value: 'v1.1.1', position: { line: 5, column: 40 } }
    });
    expect(deps[2]).is.eql({
      name: { value: 'github.com/pmezard/go-difflib', position: { line: 0, column: 0 } },
      version: { value: 'v1.0.0', position: { line: 6, column: 43 } }
    });
    expect(deps[3]).is.eql({
      name: { value: 'github.com/stretchr/testify', position: { line: 0, column: 0 } },
      version: { value: 'v1.2.2', position: { line: 7, column: 41 } }
    });
  });

  it('tests go.mod with comments', async () => {
    const deps = await provider.collect(`// This is start point.
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
      name: { value: 'github.com/alecthomas/units', position: { line: 0, column: 0 } },
      version: { value: 'v0.0.0-20151022065526-2efee857e7cf', position: { line: 4, column: 41 } }
    });
    expect(deps[1]).is.eql({
      name: { value: 'github.com/pmezard/go-difflib', position: { line: 0, column: 0 } },
      version: { value: 'v1.0.0', position: { line: 6, column: 43 } }
    });
    expect(deps[2]).is.eql({
      name: { value: 'github.com/stretchr/testify', position: { line: 0, column: 0 } },
      version: { value: 'v1.2.2', position: { line: 7, column: 41 } }
    });
  });

  it('tests empty go.mod', async () => {
    const deps = await provider.collect(``);
    expect(deps).is.eql([]);
  });

  it('tests empty lines in go.mod', async () => {
    const deps = await provider.collect(`
          module github.com/alecthomas/kingpin

          require (

            github.com/alecthomas/units v0.0.0-20151022065526-2efee857e7cf // Valid data before this.

            github.com/stretchr/testify v1.2.2

          )
          go 1.13

        `);
    expect(deps.length).equal(2);
    expect(deps[0]).is.eql({
      name: { value: 'github.com/alecthomas/units', position: { line: 0, column: 0 } },
      version: { value: 'v0.0.0-20151022065526-2efee857e7cf', position: { line: 6, column: 41 } }
    });
    expect(deps[1]).is.eql({
      name: { value: 'github.com/stretchr/testify', position: { line: 0, column: 0 } },
      version: { value: 'v1.2.2', position: { line: 8, column: 41 } }
    });
  });

  it('tests deps with spaces before and after comparators', async () => {
    const deps = await provider.collect(`
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
      name: { value: 'github.com/alecthomas/units', position: { line: 0, column: 0 } },
      version: { value: 'v0.0.0-20151022065526-2efee857e7cf', position: { line: 4, column: 44 } }
    });
    expect(deps[1]).is.eql({
      name: { value: 'github.com/davecgh/go-spew', position: { line: 0, column: 0 } },
      version: { value: 'v1.1.1', position: { line: 5, column: 49 } }
    });
    expect(deps[2]).is.eql({
      name: { value: 'github.com/pmezard/go-difflib', position: { line: 0, column: 0 } },
      version: { value: 'v1.0.0', position: { line: 6, column: 51 } }
    });
    expect(deps[3]).is.eql({
      name: { value: 'github.com/stretchr/testify', position: { line: 0, column: 0 } },
      version: { value: 'v1.2.2', position: { line: 7, column: 45 } }
    });
  });

  it('tests alpha beta and extra for version in go.mod', async () => {
    const deps = await provider.collect(`
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
      name: { value: 'github.com/alecthomas/units', position: { line: 0, column: 0 } },
      version: { value: 'v0.1.3-alpha', position: { line: 5, column: 39 } }
    });
    expect(deps[1]).is.eql({
      name: { value: 'github.com/pierrec/lz4', position: { line: 0, column: 0 } },
      version: { value: 'v2.5.2-alpha+incompatible', position: { line: 6, column: 34 } }
    });
    expect(deps[2]).is.eql({
      name: { value: 'github.com/davecgh/go-spew', position: { line: 0, column: 0 } },
      version: { value: 'v1.1.1+incompatible', position: { line: 7, column: 38 } }
    });
    expect(deps[3]).is.eql({
      name: { value: 'github.com/pmezard/go-difflib', position: { line: 0, column: 0 } },
      version: { value: 'v1.3.0+version', position: { line: 8, column: 41 } }
    });
    expect(deps[4]).is.eql({
      name: { value: 'github.com/stretchr/testify', position: { line: 0, column: 0 } },
      version: { value: 'v1.2.2+incompatible-version', position: { line: 9, column: 39 } }
    });
    expect(deps[5]).is.eql({
      name: { value: 'github.com/regen-network/protobuf', position: { line: 0, column: 0 } },
      version: { value: 'v1.3.2-alpha.regen.4', position: { line: 10, column: 45 } }
    });
    expect(deps[6]).is.eql({
      name: { value: 'github.com/vmihailenco/msgpack/v5', position: { line: 0, column: 0 } },
      version: { value: 'v5.0.0-beta.1', position: { line: 11, column: 45 } }
    });
    expect(deps[7]).is.eql({
      name: { value: 'github.com/btcsuite/btcd', position: { line: 0, column: 0 } },
      version: { value: 'v0.20.1-beta', position: { line: 12, column: 36 } }
    });
  });

  it('tests replace statements in go.mod', async () => {
    const deps = await provider.collect(`
        module github.com/alecthomas/kingpin
        go 1.13
        require (
          github.com/alecthomas/units v0.1.3-alpha
          github.com/pierrec/lz4 v2.5.2-alpha+incompatible
          github.com/davecgh/go-spew v1.1.1+incompatible
          github.com/pmezard/go-difflib v1.3.0
          github.com/stretchr/testify v1.2.2+incompatible-version
          github.com/regen-network/protobuf v1.3.2-alpha.regen.4
          github.com/vmihailenco/msgpack/v5 v5.0.0-beta.1
          github.com/btcsuite/btcd v0.0.0-20151022065526-2efee857e7cf
        )

        replace (
          github.com/alecthomas/units v0.1.3-alpha => github.com/test-user/units v13.3.2 // Required by OLM
          github.com/alecthomas/units v0.1.3 => github.com/test-user/units v13.3.2 // Required by OLM
          github.com/pierrec/lz4 => github.com/pierrec/lz4 v3.4.2 // Required by prometheus-operator
          github.com/pierrec/lz4 v3.4.1 => github.com/pierrec/lz4 v3.4.3 // same-module with diff version in replace
          github.com/davecgh/go-spew v1.1.1+incompatible => github.com/davecgh/go-spew v1.1.2
          github.com/stretchr/testify => github.com/stretchr-1/testify v1.2.3 // test with module and with one import package
          github.com/regen-network/protobuf => github.com/regen-network/protobuf1 v1.3.2 // test with module and with one import package
          github.com/pmezard/go-difflib v1.3.0 => github.com/pmezard/go-difflib v0.0.0-20151022065526-2efee857e7cf // semver to pseudo
          github.com/btcsuite/btcd v0.0.0-20151022065526-2efee857e7cf => github.com/btcsuite/btcd v0.20.1-beta // pseudo to semver
          github.com/vmihailenco/msgpack/v5 v5.0.0-beta.1 => ./msgpack/v5 // replace with local module
        )
      `);
    expect(deps.length).equal(8);
    expect(deps[0]).is.eql({
      name: { value: 'github.com/test-user/units', position: { line: 0, column: 0 } },
      version: { value: 'v13.3.2', position: { line: 16, column: 82 } }
    });
    expect(deps[1]).is.eql({
      name: { value: 'github.com/pierrec/lz4', position: { line: 0, column: 0 } },
      version: { value: 'v3.4.2', position: { line: 18, column: 60 } }
    });
    expect(deps[2]).is.eql({
      name: { value: 'github.com/davecgh/go-spew', position: { line: 0, column: 0 } },
      version: { value: 'v1.1.2', position: { line: 20, column: 88 } }
    });
    expect(deps[3]).is.eql({
      name: { value: 'github.com/pmezard/go-difflib', position: { line: 0, column: 0 } },
      version: { value: 'v0.0.0-20151022065526-2efee857e7cf', position: { line: 23, column: 81 } }
    });
    expect(deps[4]).is.eql({
      name: { value: 'github.com/stretchr-1/testify', position: { line: 0, column: 0 } },
      version: { value: 'v1.2.3', position: { line: 21, column: 72 } }
    });
    expect(deps[5]).is.eql({
      name: { value: 'github.com/regen-network/protobuf1', position: { line: 0, column: 0 } },
      version: { value: 'v1.3.2', position: { line: 22, column: 83 } }
    });
    expect(deps[6]).is.eql({
      name: { value: 'github.com/vmihailenco/msgpack/v5', position: { line: 0, column: 0 } },
      version: { value: 'v5.0.0-beta.1', position: { line: 11, column: 45 } }
    });
    expect(deps[7]).is.eql({
      name: { value: 'github.com/btcsuite/btcd', position: { line: 0, column: 0 } },
      version: { value: 'v0.20.1-beta', position: { line: 24, column: 99 } }
    });
  });

  it('tests single line replace statement in go.mod', async () => {
    const deps = await provider.collect(`
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
      name: { value: 'github.com/test-user/units', position: { line: 0, column: 0 } },
      version: { value: 'v13.3.2', position: { line: 9, column: 75 } }
    });
    expect(deps[1]).is.eql({
      name: { value: 'github.com/pierrec/lz4', position: { line: 0, column: 0 } },
      version: { value: 'v2.5.2-alpha+incompatible', position: { line: 6, column: 34 } }
    });
  });

  it('tests multiple line replace statement in go.mod', async () => {
    const deps = await provider.collect(`
        module github.com/alecthomas/kingpin
        go 1.13

        replace github.com/alecthomas/units => github.com/test-user/units v13.3.2

        require (
          github.com/alecthomas/units v0.1.3-alpha
          github.com/pierrec/lz4 v2.5.2-alpha+incompatible
          github.com/davecgh/go-spew v1.1.1+incompatible
          github.com/pmezard/go-difflib v1.3.0
        )

        replace github.com/pierrec/lz4 v2.5.2-alpha+incompatible => github.com/pierrec/lz4 v2.5.3
        replace github.com/davecgh/go-spew => github.com/davecgh/go-spew v1.1.2
        // replace github.com/pmezard/go-difflib v1.3.0 => github.com/pmezard/go-difflib v1.3.1
      `);
    expect(deps.length).equal(4);
    expect(deps[0]).is.eql({
      name: { value: 'github.com/test-user/units', position: { line: 0, column: 0 } },
      version: { value: 'v13.3.2', position: { line: 5, column: 75 } }
    });
    expect(deps[1]).is.eql({
      name: { value: 'github.com/pierrec/lz4', position: { line: 0, column: 0 } },
      version: { value: 'v2.5.3', position: { line: 14, column: 92 } }
    });
    expect(deps[2]).is.eql({
      name: { value: 'github.com/davecgh/go-spew', position: { line: 0, column: 0 } },
      version: { value: 'v1.1.2', position: { line: 15, column: 74 } }
    });
    expect(deps[3]).is.eql({
      name: { value: 'github.com/pmezard/go-difflib', position: { line: 0, column: 0 } },
      version: { value: 'v1.3.0', position: { line: 11, column: 41 } }
    });
  });


  it('tests multiple module points to same replace module in go.mod', async () => {
    const deps = await provider.collect(`
        module github.com/alecthomas/kingpin
        go 1.13
        require (
          github.com/alecthomas/units v0.1.3-alpha
          github.com/pierrec/lz4 v2.5.2-alpha+incompatible
          github.com/gogo/protobuf v1.3.0
          github.com/golang/protobuf v1.3.4
        )
        replace (
          github.com/golang/protobuf => github.com/gogo/protobuf v1.3.1
          github.com/gogo/protobuf v1.3.0 => github.com/gogo/protobuf v1.3.1
        )
      `);
    expect(deps.length).equal(4);
    expect(deps[0]).is.eql({
      name: { value: 'github.com/alecthomas/units', position: { line: 0, column: 0 } },
      version: { value: 'v0.1.3-alpha', position: { line: 5, column: 39 } }
    });
    expect(deps[1]).is.eql({
      name: { value: 'github.com/pierrec/lz4', position: { line: 0, column: 0 } },
      version: { value: 'v2.5.2-alpha+incompatible', position: { line: 6, column: 34 } }
    });
    expect(deps[2]).is.eql({
      name: { value: 'github.com/gogo/protobuf', position: { line: 0, column: 0 } },
      version: { value: 'v1.3.1', position: { line: 12, column: 71 } }
    });
    expect(deps[3]).is.eql({
      name: { value: 'github.com/gogo/protobuf', position: { line: 0, column: 0 } },
      version: { value: 'v1.3.1', position: { line: 11, column: 66 } }
    });
  });

  it('tests replace block before require in go.mod', async () => {
    const deps = await provider.collect(`
        module github.com/alecthomas/kingpin
        go 1.13

        replace (
          github.com/alecthomas/units => github.com/test-user/units v13.3.2
          github.com/pierrec/lz4 v2.5.2-alpha+incompatible => github.com/pierrec/lz4 v2.5.3
          github.com/davecgh/go-spew => github.com/davecgh/go-spew v1.1.2
          // replace github.com/pmezard/go-difflib v1.3.0 => github.com/pmezard/go-difflib v1.3.1
        )

        require (
          github.com/alecthomas/units v0.1.3-alpha
          github.com/pierrec/lz4 v2.5.2-alpha+incompatible
          github.com/davecgh/go-spew v1.1.1+incompatible
          github.com/pmezard/go-difflib v1.3.0
        )
      `);
    expect(deps.length).equal(4);
    expect(deps[0]).is.eql({
      name: { value: 'github.com/test-user/units', position: { line: 0, column: 0 } },
      version: { value: 'v13.3.2', position: { line: 6, column: 69 } }
    });
    expect(deps[1]).is.eql({
      name: { value: 'github.com/pierrec/lz4', position: { line: 0, column: 0 } },
      version: { value: 'v2.5.3', position: { line: 7, column: 86 } }
    });
    expect(deps[2]).is.eql({
      name: { value: 'github.com/davecgh/go-spew', position: { line: 0, column: 0 } },
      version: { value: 'v1.1.2', position: { line: 8, column: 68 } }
    });
    expect(deps[3]).is.eql({
      name: { value: 'github.com/pmezard/go-difflib', position: { line: 0, column: 0 } },
      version: { value: 'v1.3.0', position: { line: 16, column: 41 } }
    });
  });

  it('tests go.mod with a module and package of different version', async () => {
    const deps = await provider.collect(`
      module test/data/sample1

      go 1.15

      require (
        github.com/googleapis/gax-go v1.0.3
        github.com/googleapis/gax-go/v2 v2.0.5
      )
    `);
    expect(deps.length).equal(2);
    expect(deps[0]).is.eql({
      name: { value: 'github.com/googleapis/gax-go', position: { line: 0, column: 0 } },
      version: { value: 'v1.0.3', position: { line: 7, column: 38 } }
    });
    expect(deps[1]).is.eql({
      name: { value: 'github.com/googleapis/gax-go/v2', position: { line: 0, column: 0 } },
      version: { value: 'v2.0.5', position: { line: 8, column: 41 } }
    });
  });
});
