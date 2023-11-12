/* --------------------------------------------------------------------------------------------
 * Copyright (c) Red Hat
 * Licensed under the Apache-2.0 License. See License.txt in the project root for license information.
 * ------------------------------------------------------------------------------------------ */
'use strict';

import { Range } from 'vscode-languageserver';
import { IPosition, IDependency } from './collector';

export function getRange (dep: IDependency): Range {
  const pos: IPosition = dep.version.position;
  if (pos.line !== 0) {
    const length = dep.version.value.length;
    return {
      start: {
        line: pos.line - 1, 
        character: pos.column - 1
      },
      end: {
        line: pos.line - 1, 
        character: pos.column + length - 1}
    };
  } else {
    return dep.context.range;
  }
};

export function isDefined(obj: any, ...keys: string[]): boolean {
  for (const key of keys) {
      if (!obj || !obj[key]) {
          return false;
      }
      obj = obj[key];
  }
  return true;
}

/* Please note :: There is an issue with the usage of semverRegex Node.js package in this code.
 * Often times it fails to recognize versions that contain an added suffix, usually including extra details such as a timestamp and a commit hash.
 * At the moment, using regex directly to extract versions inclusively. */
export function semVerRegExp(str: string): RegExpExecArray {
  const regExp = /(?<=^v?|\sv?)(?:0|[1-9]\d*)\.(?:0|[1-9]\d*)\.(?:0|[1-9]\d*)(?:-(?:0|[1-9]\d*|[\da-z-]*[a-z-][\da-z-]*)(?:\.(?:0|[1-9]\d*|[\da-z-]*[a-z-][\da-z-]*))*)?(?:\+[\da-z-]+(?:\.[\da-z-]+)*)?(?=$|\s)/ig;
  return regExp.exec(str);
}