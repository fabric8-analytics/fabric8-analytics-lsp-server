'use strict';

import { expect } from 'chai';
import * as sinon from 'sinon';
import { Range } from 'vscode-languageserver';
import { CodeAction, CodeActionKind, Diagnostic } from 'vscode-languageserver/node';

import * as config from '../src/config';
import { RHDA_DIAGNOSTIC_SOURCE } from '../src/constants';
import * as codeActionHandler from '../src/codeActionHandler';

describe('Code Action Handler tests', () => {

    const mockRange0: Range = {
        start: {
            line: 123,
            character: 123
        },
        end: {
            line: 456,
            character: 456
        }
    };

    const mockRange1: Range = {
        start: {
            line: 321,
            character: 321
        },
        end: {
            line: 654,
            character: 654
        }
    };

    const mockDiagnostic0: Diagnostic[] = [
        {
            severity: 1,
            range: mockRange0,
            message: 'mock message',
            source: RHDA_DIAGNOSTIC_SOURCE,
        }
    ];

    const mockDiagnostic1: Diagnostic[] = [
        {
            severity: 3,
            range: mockRange1,
            message: 'another mock message',
            source: 'mockSource',
        }
    ];

    it('should register code actions in codeActionsMap for the same key', () => {
        const key0 = 'mockKey0';
        const codeAction1 = { title: 'Mock Action1' };
        const codeAction2 = { title: 'Mock Action2' };
        codeActionHandler.registerCodeAction(key0, codeAction1);
        codeActionHandler.registerCodeAction(key0, codeAction2);

        expect(codeActionHandler.getCodeActionsMap()[key0]).to.deep.equal([codeAction1, codeAction2]);
    });

    it('should register code actions in codeActionsMap for different keys', () => {
        const key1 = 'mockKey1';
        const key2 = 'mockKey2';
        const codeAction1 = { title: 'Mock Action1' };
        const codeAction2 = { title: 'Mock Action2' };
        codeActionHandler.registerCodeAction(key1, codeAction1);
        codeActionHandler.registerCodeAction(key2, codeAction2);

        const codeActionsMap = codeActionHandler.getCodeActionsMap();
        expect(codeActionsMap[key1]).to.deep.equal([codeAction1]);
        expect(codeActionsMap[key2]).to.deep.equal([codeAction2]);
    });

    it('should clear codeActionsMap', () => {
        expect(Object.keys(codeActionHandler.getCodeActionsMap()).length).greaterThan(0);

        codeActionHandler.clearCodeActionsMap();

        expect(Object.keys(codeActionHandler.getCodeActionsMap()).length).to.equal(0);
    });

    it('should return an empty array if no RHDA diagnostics are present and full stack analysis action is provided', () => {
        const diagnostics: Diagnostic[] = [];
        let globalConfig = {
            triggerFullStackAnalysis: 'mockTriggerFullStackAnalysis'
        };
        sinon.stub(config, 'globalConfig').value(globalConfig);

        const codeActions = codeActionHandler.getDiagnosticsCodeActions(diagnostics);

        expect(codeActions).to.be.an('array').that.is.empty;
    });

    it('should return an empty array if no RHDA diagnostics are present and full stack analysis action is not provided', () => {
        const diagnostics: Diagnostic[] = [];
        let globalConfig = {
            triggerFullStackAnalysis: ''
        };
        sinon.stub(config, 'globalConfig').value(globalConfig);

        const codeActions = codeActionHandler.getDiagnosticsCodeActions(diagnostics);

        expect(codeActions).to.be.an('array').that.is.empty;
    });

    it('should return an empty array if RHDA diagnostics are present but no matching code actions are found', () => {
        const key = 'mockKey';
        const codeAction = { title: 'Mock Action' };
        codeActionHandler.registerCodeAction(key, codeAction);
        
        let globalConfig = {
            triggerFullStackAnalysis: 'mockTriggerFullStackAnalysis'
        };
        sinon.stub(config, 'globalConfig').value(globalConfig);

        const codeActions = codeActionHandler.getDiagnosticsCodeActions(mockDiagnostic1);

        expect(codeActions).to.be.an('array').that.is.empty;
    });

    it('should generate code actions for RHDA diagnostics without full stack analysis action setting in globalConfig', async () => {
        const key = `${mockDiagnostic0[0].range.start.line}|${mockDiagnostic0[0].range.start.character}`;
        const codeAction = { title: 'Mock Action' };
        codeActionHandler.clearCodeActionsMap();
        codeActionHandler.registerCodeAction(key, codeAction);
        
        let globalConfig = {
            triggerFullStackAnalysis: ''
        };
        sinon.stub(config, 'globalConfig').value(globalConfig);

        const codeActions: CodeAction[] = codeActionHandler.getDiagnosticsCodeActions(mockDiagnostic0);

        expect(codeActions).to.deep.equal(
            [
                {
                    title: 'Mock Action',
                }
            ]
        );
    });

    it('should generate code actions for RHDA diagnostics without RHDA Diagonostic source', async () => {
        const key = `${mockDiagnostic1[0].range.start.line}|${mockDiagnostic1[0].range.start.character}`;
        const codeAction = { title: 'Mock Action' };
        codeActionHandler.clearCodeActionsMap();
        codeActionHandler.registerCodeAction(key, codeAction);
        
        let globalConfig = {
            triggerFullStackAnalysis: 'mockTriggerFullStackAnalysis'
        };
        sinon.stub(config, 'globalConfig').value(globalConfig);

        const codeActions: CodeAction[] = codeActionHandler.getDiagnosticsCodeActions(mockDiagnostic1);

        expect(codeActions).to.deep.equal(
            [
                {
                    title: 'Mock Action',
                }
            ]
        );
    });

    it('should generate code actions for RHDA diagnostics with full stack analysis action', async () => {
        const key = `${mockDiagnostic0[0].range.start.line}|${mockDiagnostic0[0].range.start.character}`;
        const codeAction = { title: 'Mock Action' };
        codeActionHandler.registerCodeAction(key, codeAction);
        
        let globalConfig = {
            triggerFullStackAnalysis: 'mockTriggerFullStackAnalysis'
        };
        sinon.stub(config, 'globalConfig').value(globalConfig);

        const codeActions: CodeAction[] = codeActionHandler.getDiagnosticsCodeActions(mockDiagnostic0);

        expect(codeActions).to.deep.equal(
            [
                {
                    title: 'Mock Action',
                },
                {
                  title: 'Detailed Vulnerability Report',
                  kind: CodeActionKind.QuickFix,
                  command: { 
                    title: 'Analytics Report', 
                    command: 'mockTriggerFullStackAnalysis' 
                }
                }
            ]
        );
    });

    it('should return a switch to recommended version code action without RedHat repository recommendation', async () => {

        const codeAction: CodeAction = codeActionHandler.generateSwitchToRecommendedVersionAction( 'mockTitle', 'mockVersionReplacementString', mockDiagnostic0[0], 'mock/path/noPom.xml');
        expect(codeAction).to.deep.equal(
            {
                "diagnostics": [
                    {
                    "message": "mock message",
                    "range": {
                        "end": {
                        "character": 456,
                        "line": 456
                        },
                        "start": {
                        "character": 123,
                        "line": 123
                        }
                    },
                    "severity": 1,
                    "source": RHDA_DIAGNOSTIC_SOURCE
                    }
                ],
                "edit": {
                    "changes": {
                    "mock/path/noPom.xml": [
                        {
                        "newText": "mockVersionReplacementString",
                        "range": {
                            "end": {
                            "character": 456,
                            "line": 456
                            },
                            "start": {
                            "character": 123,
                            "line": 123
                            }
                        }
                        }
                    ]
                    }
                },
                "kind": "quickfix",
                "title": "mockTitle"
            }
        );
    });

    it('should return a switch to recommended version code action with RedHat repository recommendation', async () => {

        let globalConfig = {
            triggerRHRepositoryRecommendationNotification: 'mockTriggerRHRepositoryRecommendationNotification'
        };
        sinon.stub(config, 'globalConfig').value(globalConfig);

        const codeAction: CodeAction = codeActionHandler.generateSwitchToRecommendedVersionAction( 'mockTitle', 'mockVersionReplacementString', mockDiagnostic1[0], 'mock/path/pom.xml');
        expect(codeAction).to.deep.equal(
            {
                "command": {
                    "command": 'mockTriggerRHRepositoryRecommendationNotification',
                    "title": "RedHat repository recommendation"
                },
                "diagnostics": [
                    {
                    "message": "another mock message",
                    "range": {
                        "end": {
                        "character": 654,
                        "line": 654
                        },
                        "start": {
                        "character": 321,
                        "line": 321
                        }
                    },
                    "severity": 3,
                    "source": 'mockSource'
                    }
                ],
                "edit": {
                    "changes": {
                    "mock/path/pom.xml": [
                        {
                        "newText": "mockVersionReplacementString",
                        "range": {
                            "end": {
                            "character": 654,
                            "line": 654
                            },
                            "start": {
                            "character": 321,
                            "line": 321
                            }
                        }
                        }
                    ]
                    }
                },
                "kind": "quickfix",
                "title": "mockTitle"
            }
        );
    });
});