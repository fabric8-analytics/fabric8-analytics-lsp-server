#!/bin/bash
# Show command before executing
set -x

# Exit on error
set -e

# This option sets the exit code of a pipeline to that of the rightmost command to exit with a
# non-zero status, or to zero if all commands of the pipeline exit successfully.
set -o pipefail

function release() {
    # add .npmrc file to give permissions
    echo '//registry.npmjs.org/:_authToken=${NPM_TOKEN}' > ~/.npmrc

    npm whoami

    # Enable verbose output
    npm config set loglevel verbose

    # Build and Release fabric8-analytics-lsp-server (It will update the tag on github and push fabric8-analytics-lsp-server to npmjs.org)
    # From GIT_BRANCH remove origin/ to make semantic-release happy.
    GIT_BRANCH="${GIT_BRANCH//origin\//}" npm run semantic-release
}
