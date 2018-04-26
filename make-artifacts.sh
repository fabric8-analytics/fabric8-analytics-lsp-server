#!/bin/bash -ex

rm -Rf target/ output/
npm install
npm run-script build
npm run dist

# rename the tar to the version in the pom so it's easier to deploy it 
if [[ $1 ]]; then mv ca-lsp-server{,-${1}}.tar; fi

# move the tar into a target/ folder
mkdir -p target && mv *lsp-server*.tar* target/

# create a zip because downstream eclipse plugin build breaks when reading the tar
pushd output >/dev/null
if [[ ${1} ]]; then 
  zip -9r ../target/ca-lsp-server-${1}.zip *
else
  zip -9r ../target/ca-lsp-server.zip *
fi
popd >/dev/null

# to publish the generated tarball, pass in params:
# eg., $0 0.0.6-SNAPSHOT USER@SERVER:BASE/PATH 99
if [[ $2 ]]; then
	DESTINATION=$2 # set this to where you want to rsync the files, eg., USER@SERVER:BASE/PATH 
	SOURCEDIR=`pwd`/target
	BUILD_TIMESTAMP=`date -u +%Y-%m-%d_%H-%M-%S`
	if [[ $3 ]]; then BUILD_NUMBER="$3"; else BUILD_NUMBER=00; fi
	for f in publish/rsync.sh util/cleanup/jbosstools-cleanup.sh; do
	  curl -s -S -k --create-dirs -o ${SOURCEDIR}/${f} https://raw.githubusercontent.com/jbosstools/jbosstools-build-ci/master/${f} && \
	  chmod +x ${SOURCEDIR}/${f}
	done
	${SOURCEDIR}/publish/rsync.sh -s ${SOURCEDIR} -i *lsp-server*.* \
	  -DESTINATION ${DESTINATION} -k 4 -l 0 -a 4 --no-regen-metadata -BUILD_NUMBER ${BUILD_NUMBER} \
	  -t photon/snapshots/builds/jbosstools-fabric8analytics-lsp-server_master/${BUILD_TIMESTAMP}-B${BUILD_NUMBER}/
fi