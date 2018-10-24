# Dependency Analytics LSP Server

LSP Server that can analyze your dependencies specified in `package.json`.

## Build

```
npm install
npm run-script build
```
## Setup
we use 2 environment variables to setup the recommender API
```
export RECOMMENDER_API_URL= the-url
export RECOMMENDER_API_TOKEN=the-token

```

== Release

Semantic release are done via fabric8cd using `semantic-release`.
- merging each PR will result with an automatic build of master
- and a release apatch, minor or major version. You should use correct link:https://github.com/semantic-release/semantic-release#commit-message-format[commit message].

## License

Apache-2.0 
 
