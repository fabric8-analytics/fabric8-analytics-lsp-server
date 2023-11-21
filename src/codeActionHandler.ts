/* --------------------------------------------------------------------------------------------
 * Copyright (c) Red Hat
 * Licensed under the Apache-2.0 License. See License.txt in the project root for license information.
 * ------------------------------------------------------------------------------------------ */
'use strict';

import { CodeAction, CodeActionKind, Diagnostic } from 'vscode-languageserver/node';
import { globalConfig } from './config';
import { RHDA_DIAGNOSTIC_SOURCE } from './constants';

/**
 * Retrieves code actions based on diagnostics and file type.
 * @param diagnostics - An array of available diagnostics.
 * @returns An array of CodeAction objects to be made available to the user.
 */
function getDiagnosticsCodeActions(diagnostics: Diagnostic[]): CodeAction[] {
    const hasRhdaDiagonostic = diagnostics.some(diagnostic => diagnostic.source === RHDA_DIAGNOSTIC_SOURCE);
    const codeActions: CodeAction[] = [];

    if (globalConfig.triggerFullStackAnalysis && hasRhdaDiagonostic) {
        codeActions.push(generateFullStackAnalysisAction());
    }

    return codeActions;
}

/**
 * Generates a code action for a detailed RHDA report on the analyzed manifest file.
 * @returns A CodeAction object for an RHDA report.
 */
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