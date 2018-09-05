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
    npm run semantic-release

    publish_tar

    create_merge_PR_vscode

    create_PR_RHChe
}

function publish_tar() {
    # get the latest release id
    res=$(curl -s  https://api.github.com/repos/fabric8-analytics/fabric8-analytics-lsp-server/releases/latest | jq '. | { id: .id, upload_url: .upload_url }')

    release_id=$(echo $res | jq .id)
    upload_url=$(echo $res | jq .upload_url) 

    echo $release_id
    echo $upload_url

    npm_user=$(npm whoami)

    # upload the tar file to the latest release id
    filename="./ca-lsp-server.tar"
    asset_upload_url="https://uploads.github.com/repos/fabric8-analytics/fabric8-analytics-lsp-server/releases/$release_id/assets?name=$(basename $filename)"
    
    curl -X POST -H "Authorization: token $GH_TOKEN" -H "Content-Type: application/octet-stream" -u $npm_user:$GH_TOKEN --data-binary @"$filename" $asset_upload_url
}

# This function raises a PR against fabric8-analytics-vscode-extension
function create_merge_PR_vscode {
    # Fetch latest tags
    git pull --tags origin master

    # extract version number from latest git tag
    new_lsp_server_version=$(git tag --sort=-v:refname | head -1 | cut -d'v' -f 2)

    repo="fabric8-analytics-vscode-extension"
    org="fabric8-analytics"
    project="${org}/${repo}"
    baseUrl="https://api.github.com/repos"
    id=$(uuidgen)
    git clone "https://github.com/${project}.git"
    cd ${repo} && git checkout -b versionUpdate"${id}"

    # find fabric8-analytics-lsp-server > extract version number > remove ", char > trim whitespacs
    current_lsp_server_version=$( grep fabric8-analytics-lsp-server package.json \
        | awk -F: '{ print $2 }' \
        | sed 's/[",]//g' \
        | tr -d '[:space:]' )
    echo "New LSP Server version:" $new_lsp_server_version
    echo "Current LSP Server version:" $current_lsp_server_version
    if [ "$new_lsp_server_version" == "$current_lsp_server_version" ]; then
        echo "Skippping as fabric8-analytics-lsp-server is already on version $new_lsp_server_version"
        exit 0
    fi

    git config --global user.email fabric8cd@gmail.com
    git config --global user.name fabric8-cd

    # Set authentication credentials to allow "git push"
    git remote set-url origin https://fabric8cd:${GH_TOKEN}@github.com/${project}.git

    # Create PR on fabric8-analytics-vscode-extension to update LSP Server
    message="fix(version): update package.json fabric8-analytics-lsp-server to ${new_lsp_server_version}"
    updatePackageJSONVersion "$new_lsp_server_version"
    git add package.json
    git commit -m "${message}"
    git push origin versionUpdate"${id}"
    local body="{
        \"title\": \"${message}\",
        \"head\": \"versionUpdate${id}\",
        \"base\": \"master\"
        }"

    apiUrl="${baseUrl}/${project}/pulls"
    echo "Creating PR for ${apiUrl}"
    PR_id=$(curl --silent -X POST -H "Authorization: Bearer $GH_TOKEN" -d "${body}" "${apiUrl}" \
            | sed -n 's/.*"number": \(.*\),/\1/p' )
    echo "Received PR id: ${PR_id}"

    # Wait for all CI checks on PR to be successful
    # waitUntilSuccess "${PR_id}" "${project}"

    # Merge PR
    # apiUrl="${baseUrl}/${project}/pulls/${PR_id}/merge"
    # echo "Merging PR ${PR_id}"
    # curl --silent -X PUT -H "Authorization: Bearer $GH_TOKEN" "${apiUrl}"
}

function create_PR_RHChe {
    echo $new_lsp_server_version

    # go to the root directory which is fabric8-analytics-lsp-server
    cd ..

    repo="rh-che"
    org="redhat-developer"
    project="${org}/${repo}"
    baseUrl="https://api.github.com/repos"
    id=$(uuidgen)
    git clone "https://github.com/${project}.git"
    cd ${repo} && git checkout -b versionUpdate"${id}"

    # find fabric8-analytics-lsp-server version
    lsp_script_sh_path="./rh-che/plugins/ls-bayesian-agent/src/main/resources/installers/1.0.0/com.redhat.bayesian.lsp.script.sh"
    current_lsp_server_version=$( grep AGENT_BINARIES_URI= $lsp_script_sh_path | cut -d '/' -f 8 )
    echo "New LSP Server version:" $new_lsp_server_version
    echo "Current LSP Server version:" $current_lsp_server_version
    if [ "$new_lsp_server_version" == "$current_lsp_server_version" ]; then
        echo "Skippping as fabric8-analytics-lsp-server is already on version $new_lsp_server_version"
        exit 0
    fi

    git config --global user.email fabric8cd@gmail.com
    git config --global user.name fabric8-cd

    # Set authentication credentials to allow "git push"
    git remote set-url origin https://fabric8cd:${GH_TOKEN}@github.com/${project}.git

    # Create PR on fabric8-analytics-vscode-extension to update LSP Server
    message="fix(version): update fabric8-analytics-lsp-server to ${new_lsp_server_version}"
    updateRhCheScriptFile "$lsp_script_sh_path" "$new_lsp_server_version"
    git add $lsp_script_sh_path
    git commit -m "${message}"
    git push origin versionUpdate"${id}"
    local body="{
        \"title\": \"${message}\",
        \"head\": \"versionUpdate${id}\",
        \"base\": \"master\"
        }"

    apiUrl="${baseUrl}/${project}/pulls"
    echo "Creating PR for ${apiUrl}"
    PR_id=$(curl --silent -X POST -H "Authorization: Bearer $GH_TOKEN" -d "${body}" "${apiUrl}" \
            | sed -n 's/.*"number": \(.*\),/\1/p' )
    echo "Received PR id: ${PR_id}"
}

# Updates fabric8-analytics-lsp-server's version in package.json file
function updatePackageJSONVersion {
    local f="package.json"
    local p="fabric8-analytics-lsp-server"
    local v=$1
    sed -i -r "s/\"${p}\": \"[0-9][0-9]{0,2}.[0-9][0-9]{0,2}(.[0-9][0-9]{0,2})?(.[0-9][0-9]{0,2})?(-development)?\"/\"${p}\": \"${v}\"/g" ${f}
}

# Updates fabric8-analytics-lsp-server's version in com.redhat.bayesian.lsp.script.sh file
function updateRhCheScriptFile {
    local f=$1
    local v=$2
    fabric8-analytics-lsp-server/releases/download/
    sed -i -E "s/\(fabric8-analytics-lsp-server\/releases\/download\/\)\(.*\)\(\/ca-lsp-server.tar\)/\1${v}\3/" ${f}
}

# Wait for all CI checks to pass
function waitUntilSuccess {
    pr_id=$1
    project=$2
    ref=$( curl --silent -X GET https://api.github.com/repos/"${project}"/pulls/"${pr_id}" \
           | sed -n 's/.*"ref": "\(.*\)",/\1/p' | head -1) # Extract "ref" value from the response
    status="NA"
    NEXT_WAIT_TIME=0
    # Max wait 720 seconds
    until [ "$status" == "success" ] || [ $NEXT_WAIT_TIME -eq 7 ]; do
        status=$( curl --silent -X GET https://api.github.com/repos/"${project}"/commits/"${ref}"/status \
                  | sed -n 's/.*"state": "\(.*\)",/\1/p')  # Extract "state" value from the response
        echo "Pull Request status: ${status}.  Waiting to merge..."
        sleep $(( NEXT_WAIT_TIME++ ))
    done
}
