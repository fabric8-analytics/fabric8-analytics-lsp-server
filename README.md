# Dependency Analytics LSP Server

![Release](https://github.com/fabric8-analytics/fabric8-analytics-lsp-server/workflows/Release/badge.svg?branch=master)
[![NPM Version](https://img.shields.io/npm/v/fabric8-analytics-lsp-server.svg)](https://www.npmjs.com/package/fabric8-analytics-lsp-server)
![CI Build](https://github.com/fabric8-analytics/fabric8-analytics-lsp-server/workflows/CI%20Build/badge.svg?branch=master)
[![codecov](https://codecov.io/gh/fabric8-analytics/fabric8-analytics-lsp-server/branch/master/graph/badge.svg?token=aVThXjheDf)](https://codecov.io/gh/fabric8-analytics/fabric8-analytics-lsp-server)

Language Server(LSP) that can analyze your dependencies specified in `package.json`, `pom.xml`, `requirements.txt` and `go.mod`.

## Build

```
npm install
```

## Test

```
npm test
```

## Setup

we use 2 environment variables to setup the recommender API either you need to set OSIO user token or 3scale User key along with Api url as in below.

```
export RECOMMENDER_API_URL= the-url + '/api/v2'
```

```
export THREE_SCALE_USER_TOKEN=the-user-token
```

## Release

Semantic release are done via Github Actions using `semantic-release`.
- merging each PR will result with an automatic build of master
- and a release apatch, minor or major version. You should use correct [commit message](https://github.com/semantic-release/semantic-release#commit-message-format).

## Clients

 client which consumes Dependency Analytics Language Server:
 - [VSCode Extension](https://github.com/fabric8-analytics/fabric8-analytics-vscode-extension)
 - [IntelliJ Plugin](https://github.com/redhat-developer/intellij-dependency-analytics)

## License

Apache-2.0
