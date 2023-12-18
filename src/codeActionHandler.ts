/* --------------------------------------------------------------------------------------------
 * Copyright (c) Red Hat
 * Licensed under the Apache-2.0 License. See License.txt in the project root for license information.
 * ------------------------------------------------------------------------------------------ */
'use strict';

import * as path from 'path';
import { CodeAction, CodeActionKind, Diagnostic } from 'vscode-languageserver/node';

import { globalConfig } from './config';
import { RHDA_DIAGNOSTIC_SOURCE } from './constants';

let codeActionsMap: Map<string, CodeAction[]> = new Map<string, CodeAction[]>();

/**
 * Gets the code actions map.
 */
function getCodeActionsMap(): Map<string, CodeAction[]> {
    return codeActionsMap;
}

/**
 * Clears the code actions map.
 */
function clearCodeActionsMap() {
    codeActionsMap = new Map<string, CodeAction[]>();
}

/**
 * Registers a code action.
 * @param key - The key to register the code action against.
 * @param codeAction - The code action to be registered.
 */
function registerCodeAction(key: string, codeAction: CodeAction) {
    codeActionsMap[key] = codeActionsMap[key] || [];
    codeActionsMap[key].push(codeAction);
}

/**
 * Retrieves code actions based on diagnostics and file type.
 * @param diagnostics - An array of available diagnostics.
 * @param uri - The URI of the file being analyzed.
 * @returns An array of CodeAction objects to be made available to the user.
 */
function getDiagnosticsCodeActions(diagnostics: Diagnostic[]): CodeAction[] {
    let hasRhdaDiagonostic: boolean = false; 
    const codeActions: CodeAction[] = [];

    for (const diagnostic of diagnostics) {

        const key = `${diagnostic.range.start.line}|${diagnostic.range.start.character}`;
        const diagnosticCodeActions = codeActionsMap[key] || [];
        codeActions.push(...diagnosticCodeActions);

        hasRhdaDiagonostic ||= diagnostic.source === RHDA_DIAGNOSTIC_SOURCE;
    }

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

/**
 * Generates a code action to switch to the recommended version.
 * @param title - The title of the code action.
 * @param versionReplacementString - The version replacement string.
 * @param diagnostic - The diagnostic information.
 * @param uri - The URI of the file.
 * @returns A CodeAction object for switching to the recommended version.
 */
function generateSwitchToRecommendedVersionAction(title: string, versionReplacementString: string, diagnostic: Diagnostic, uri: string): CodeAction {
    const codeAction: CodeAction = {
        title: title,
        diagnostics: [diagnostic], 
        kind: CodeActionKind.QuickFix,
        edit: {
            changes: {
            }
        }
    };

    codeAction.edit.changes[uri] = [{
        range: diagnostic.range,
        newText: versionReplacementString
    }];

    if (path.basename(uri) === 'pom.xml') {
        codeAction.command = {
            title: 'RedHat repository recommendation',
            command: globalConfig.triggerRHRepositoryRecommendationNotification,
        };
    }

    return codeAction;
}

export { getCodeActionsMap, clearCodeActionsMap, registerCodeAction , generateSwitchToRecommendedVersionAction, getDiagnosticsCodeActions };