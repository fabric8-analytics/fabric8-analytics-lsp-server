/* --------------------------------------------------------------------------------------------
 * Copyright (c) Red Hat
 * Licensed under the Apache-2.0 License. See License.txt in the project root for license information.
 * ------------------------------------------------------------------------------------------ */
'use strict';

/**
 * Commonly used constants
 */

/**
 * Default source name for the Red Hat Dependency Analytics extension in diagnostics.
 */
export const RHDA_DIAGNOSTIC_SOURCE = 'Red Hat Dependency Analytics Plugin';
/**
 * Placeholder used as a version for dependency templates.
 */
export const VERSION_PLACEHOLDER: string = '__VERSION__';
/**
 * Represents provider ecosystem names.
 */
export const GRADLE = 'gradle';
export const MAVEN = 'maven';
export const GOLANG = 'golang';
export const NPM = 'npm';
export const PYPI = 'pypi';
/**
 * An object mapping ecosystem names to their true ecosystems.
 */
export const ecosystemNameMappings: { [key: string]: string } = {
    [GRADLE]: MAVEN,
    [MAVEN]: MAVEN,
    [GOLANG]: GOLANG,
    [NPM]: NPM,
    [PYPI]: PYPI,
};