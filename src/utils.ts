/* --------------------------------------------------------------------------------------------
 * Copyright (c) Red Hat
 * Licensed under the Apache-2.0 License. See License.txt in the project root for license information.
 * ------------------------------------------------------------------------------------------ */
'use strict';
import { Position, Range } from 'vscode-languageserver';
import { IPositionedString, IPosition, IDependency } from './collector';

/* VSCode and Che transmit the file buffer in a different manner,
 * so we have to use different functions for computing the
 * positions and ranges so that the lines are rendered properly.
 */

const _toLspPositionChe = (pos: IPosition): Position => {
  return {line: pos.line - 1, character: pos.column - 1};
};

const _getRangeChe = (ps: IPositionedString): Range => {
  const length = ps.value.length;
  return {
      start: _toLspPosition(ps.position),
      end: {line: ps.position.line - 1, character: ps.position.column + length - 1}
  };
};

export const _toLspPosition = (pos: IPosition): Position => {
  return _toLspPositionChe(pos);
};

export const getRange = (dep: IDependency): Range => {
  if (dep.version.position.line !== 0) {
    return _getRangeChe(dep.version);
  } else {
    return dep.context.range;
  }
  
};

export const VERSION_TEMPLATE: string = '__VERSION__';