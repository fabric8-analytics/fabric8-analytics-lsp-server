# Dependency Analytics LSP Server

Language Server(LSP) that can analyze your dependencies specified in `package.json` and `pom.xml`.

## Build

```
npm install
npm run-script build
```

## Test

```
npm test
```

## Setup

we use 2 environment variables to setup the recommender API either you need to set OSIO user token or 3scale User key along with Api url as in below.

```
export RECOMMENDER_API_URL= the-url + '/api/v1'
```

```
export RECOMMENDER_API_TOKEN=the-token
export THREE_SCALE_USER_TOKEN=the-user-token
```

## Release

Semantic release are done via fabric8cd using `semantic-release`.
- merging each PR will result with an automatic build of master
- and a release apatch, minor or major version. You should use correct [commit message](https://github.com/semantic-release/semantic-release#commit-message-format).

## Clients

 client which consumes Dependency Analytics Language Server:
 - [VSCode Extension](https://github.com/fabric8-analytics/fabric8-analytics-vscode-extension)
 - [DevStudio Plugin](https://github.com/fabric8-analytics/fabric8-analytics-devstudio-plugin)
 - [RH-Che](https://github.com/redhat-developer/rh-che)

## License

Apache-2.0 

