/* --------------------------------------------------------------------------------------------
 * Copyright (c) Red Hat
 * Licensed under the Apache-2.0 License. See License.txt in the project root for license information.
 * ------------------------------------------------------------------------------------------ */
'use strict';

import { CodeAction, CodeActionKind, Diagnostic } from 'vscode-languageserver/node';
import { codeActionsMap } from './diagnosticsHandler';
import { globalConfig } from './config';
import { RHDA_DIAGNOSTIC_SOURCE } from './constants';

function getDiagnosticsCodeActions( diagnostics: Diagnostic[], fileType: string ): CodeAction[] {
    const codeActions: CodeAction[] = [];
    let hasRhdaDiagonostic: boolean = false;
    
    for (const diagnostic of diagnostics) {
        const codeAction = codeActionsMap[diagnostic.range.start.line + '|' + diagnostic.range.start.character];
        if (codeAction) {
            
            if (fileType === 'pom.xml') {
                // add RedHat repository recommendation command to action
                codeAction.command = {
                title: 'RedHat repository recommendation',
                command: globalConfig.triggerRHRepositoryRecommendationNotification,
                };   
            }

            codeActions.push(codeAction);

        }
        if (!hasRhdaDiagonostic) {
            hasRhdaDiagonostic = diagnostic.source === RHDA_DIAGNOSTIC_SOURCE;
        }
    }
    if (globalConfig.triggerFullStackAnalysis && hasRhdaDiagonostic) {
        codeActions.push(generateFullStackAnalysisAction());
    }
    return codeActions;
}

function generateFullStackAnalysisAction(): CodeAction {
    return {
        title: 'Detailed Vulnerability Report',
        kind: CodeActionKind.QuickFix,
        command: {
            title: 'Analytics Report',
            command: globalConfig.triggerFullStackAnalysis,
        }
    };
}

export { getDiagnosticsCodeActions };