#!/bin/bash -ex

rm -Rf ca-lsp-server.tar output/
npm install
npm run-script build
npm run dist

