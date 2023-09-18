# Red Hat Dependency Analytics LSP Server

![Release](https://github.com/fabric8-analytics/fabric8-analytics-lsp-server/workflows/Release/badge.svg?branch=master)
![GitHub Package Version](https://img.shields.io/github/package-json/v/fabric8-analytics/fabric8-analytics-lsp-server/master?logo=github&label=GitHub%20Package)
![CI](https://github.com/fabric8-analytics/fabric8-analytics-lsp-server/workflows/CI/badge.svg?branch=master)
[![Codecov](https://codecov.io/gh/fabric8-analytics/fabric8-analytics-lsp-server/branch/master/graph/badge.svg?token=aVThXjheDf)](https://codecov.io/gh/fabric8-analytics/fabric8-analytics-lsp-server)

Language Server(LSP) that can analyze your dependencies specified in `package.json`, `pom.xml` and `go.mod`.

## Build

```
npm install
```

## Test

```
npm test
```

## Release

Releases are done via Github Actions using `npm` to publish packages to `GitHub Packages`.
- Upon merging a pull request into the master branch, an automated staging process for the master branch is initiated.
- The version specified in the package.json file is adjusted in accordance with the predefined configuration, which may involve bumping it to a prerelease, patch, minor, or major version.
- Subsequently, the project undergoes the building process.
- A package is published to GitHub Packages, containing the latest modifications.
- A commit is made, signifying the changes introduced in the package.
- A tag is created, reflecting the updated version number.
- Finally, a release is issued, accompanied by the appropriate version identification.

## Clients

 client which consumes Red Hat Dependency Analytics Language Server:
 - [VSCode Extension](https://github.com/fabric8-analytics/fabric8-analytics-vscode-extension)

## License

Apache-2.0
