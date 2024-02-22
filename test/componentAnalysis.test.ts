'use strict';

import { expect } from 'chai';
import { rewireModule, cleanupRewireFiles } from './utils';
import { TextDocumentSyncKind, Connection, DidChangeConfigurationNotification } from 'vscode-languageserver';
import { createConnection, TextDocuments, InitializeParams, InitializeResult, CodeAction, ProposedFeatures } from 'vscode-languageserver/node';


describe('ComponentAnalysis tests', () => {
    
    const compiledFilePath = 'dist/componentAnalysis';    

    const stackAnalysisReportHtmlMock = '<html>RHDA Report Mock</html>';

    let exhortMock = {
        default: {
            componentAnalysis: async () => stackAnalysisReportHtmlMock,
        }
    };

    let componentAnalysisRewire;

    before(async() => {
        const connection: Connection = createConnection(ProposedFeatures.all);
        let hasConfigurationCapability = false
        connection.onInitialize((params: InitializeParams): InitializeResult => {

            const capabilities = params.capabilities;
            hasConfigurationCapability = !!(
                capabilities.workspace && !!capabilities.workspace.configuration
            );
            return {
                capabilities: {
                    textDocumentSync: TextDocumentSyncKind.Full,
                    codeActionProvider: true
                }
            };
        });
        
        /**
         * Registers a callback when the connection is fully initialized.
         */
        connection.onInitialized(() => {
            if (hasConfigurationCapability) {
                connection.client.register(DidChangeConfigurationNotification.type, undefined);
            }
        });

        console.log("0 done")

        componentAnalysisRewire = await rewireModule(compiledFilePath);
        console.log(componentAnalysisRewire._get__("exhort_javascript_api_1").default)
        console.log("1 done")
        
        componentAnalysisRewire.__Rewire__('exhort_javascript_api_1', exhortMock);
        console.log("2 done")

    });
    
    it('should return true when all keys are defined in the object (with key request)', async () => {
        await componentAnalysisRewire.executeComponentAnalysis('mock/path/to/manifest', '')
            .then((result) => {
                expect(result).to.equal(stackAnalysisReportHtmlMock);
            })
    });
});