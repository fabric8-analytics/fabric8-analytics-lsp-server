'use strict';

import { expect } from 'chai';
import * as sinon from 'sinon';
import { Range } from 'vscode-languageserver';
import { CodeAction, CodeActionKind, Diagnostic } from 'vscode-languageserver/node';
import * as config from '../src/config';
import { RHDA_DIAGNOSTIC_SOURCE } from '../src/constants';
import { getDiagnosticsCodeActions } from '../src/codeActionHandler';

describe('Code Action Handler test', () => {

    const mockRange: Range = {
        start: {
            line: 123,
            character: 123
        },
        end: {
            line: 456,
            character: 456
        }
    };

    const mockDiagnostics: Diagnostic[] = [
        {
            severity: 1,
            range: mockRange,
            message: 'mock message',
            source: RHDA_DIAGNOSTIC_SOURCE,
        },
        {
            severity: 2,
            range: mockRange,
            message: 'another mock message',
            source: RHDA_DIAGNOSTIC_SOURCE,
        }
    ];

    it('should return an empty array if no RHDA diagnostics are present', () => {
        const diagnostics: Diagnostic[] = [];

        const codeActions = getDiagnosticsCodeActions(diagnostics);

        expect(codeActions).to.be.an('array').that.is.empty;
    });

    it('should generate code actions for RHDA diagnostics when full stack analysis action is provided', async () => {
        let globalConfig = {
            triggerFullStackAnalysis: 'mockAction'
        };
        sinon.stub(config, 'globalConfig').value(globalConfig);

        const codeActions: CodeAction[] = getDiagnosticsCodeActions(mockDiagnostics);

        expect(codeActions).to.deep.equal(
            [
                {
                  title: 'Detailed Vulnerability Report',
                  kind: CodeActionKind.QuickFix,
                  command: { 
                    title: 'Analytics Report', 
                    command: 'mockAction' }
                }
            ]
        );
    });

    it('should return an empty array when no full stack analysis action is provided', async () => {
        let globalConfig = {
            triggerFullStackAnalysis: ''
        };
        sinon.stub(config, 'globalConfig').value(globalConfig);

        const codeActions: CodeAction[] = getDiagnosticsCodeActions(mockDiagnostics);

        expect(codeActions).to.be.an('array').that.is.empty;
    });
});