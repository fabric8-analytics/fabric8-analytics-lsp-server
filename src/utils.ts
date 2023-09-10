/* --------------------------------------------------------------------------------------------
 * Copyright (c) Red Hat
 * Licensed under the Apache-2.0 License. See License.txt in the project root for license information.
 * ------------------------------------------------------------------------------------------ */
'use strict';
import { Position, Range } from 'vscode-languageserver';
import { IPositionedString, IPosition, IDependency } from './collector';
import { config } from './config';

/* VSCode and Che transmit the file buffer in a different manner,
 * so we have to use different functions for computing the
 * positions and ranges so that the lines are rendered properly.
 */

let _to_lsp_position_che = (pos: IPosition): Position => {
  return {line: pos.line - 1, character: pos.column - 1};
};

let _get_range_che = (ps: IPositionedString): Range => {
   let length = ps.value.length;
  return {
      start: to_lsp_position(ps.position),
      end: {line: ps.position.line - 1, character: ps.position.column + length - 1}
  };
};

export let to_lsp_position = (pos: IPosition): Position => {
  return _to_lsp_position_che(pos);
};

export let get_range = (dep: IDependency): Range => {
  if (dep.version.position.line !== 0) {
    return _get_range_che(dep.version);
  } else {
    return dep.context.range;
  }
  
};

export const VERSION_TEMPLATE: string = '__VERSION__';