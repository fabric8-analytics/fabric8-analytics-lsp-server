#!/bin/bash

set -ex

load_jenkins_vars() {
  if [ -e "jenkins-env" ]; then
      cat jenkins-env \
        | grep -E "(JENKINS_URL|GIT_BRANCH|GIT_COMMIT|BUILD_NUMBER|ghprbSourceBranch|ghprbActualCommit|BUILD_URL|ghprbPullId|RECOMMENDER_API_TOKEN|NPM_TOKEN|GH_TOKEN)=" \
        | sed 's/^/export /g' \
        > ~/.jenkins-env
      source ~/.jenkins-env

      echo "CICO: Jenkins environment variables loaded"
  fi
}

prep() {
  yum -y update
  # install latest version of git
  yum -y install http://opensource.wandisco.com/centos/7/git/x86_64/wandisco-git-release-7-2.noarch.rpm
  yum -y install make git gcc-c++ bzip2 fontconfig jq
  curl -sL https://rpm.nodesource.com/setup_14.x | sudo -E bash -
  yum -y install nodejs
}

install_dependencies() {
  # clean up
  rm -Rf ca-lsp-server.tar output/

  # Build fabric8-analytics-lsp-server
  npm install;

  if [ $? -eq 0 ]; then
      echo 'CICO: npm install : OK'
  else
      echo 'CICO: npm install : FAIL'
      exit 1
  fi
}

build_project() {
  # run build
  npm run build

  if [ $? -eq 0 ]; then
    echo 'CICO: build OK'
  else
    echo 'CICO: build FAIL'
    exit 1
  fi
}

run_unit_tests() {
    # Exec unit tests
    npm test

    if [ $? -eq 0 ]; then
        echo 'CICO: unit tests OK'
    else
        echo 'CICO: unit tests FAIL'
        exit 2
    fi
}


. cico_release.sh

load_jenkins_vars

prep
