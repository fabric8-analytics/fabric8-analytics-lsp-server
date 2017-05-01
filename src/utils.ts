/* --------------------------------------------------------------------------------------------
 * Copyright (c) Pavel Odvody 2016
 * Licensed under the Apache-2.0 License. See License.txt in the project root for license information.
 * ------------------------------------------------------------------------------------------ */
'use strict';
import { Stream, Readable } from 'stream';
import { IPosition } from './json';
import { IPositionedString } from './collector';
import { Position, Range } from 'vscode-languageserver';

export let stream_from_string = (s: string): Stream => {
  let stream = new Readable();
  stream.push(s);
  stream.push(null);
  return stream;
}

/* VSCode and Che transmit the file buffer in a different manner,
 * so we have to use different functions for computing the
 * positions and ranges so that the lines are rendered properly.
 */
let _to_lsp_position_vscode = (pos: IPosition): Position => {
  return {line: pos.line/2, character: pos.column - 1};
};

let _get_range_vscode = (ps: IPositionedString): Range => {
  let length = ps.value.length;
  return {
      start: to_lsp_position(ps.position), 
      end: {line: ps.position.line/2, character: ps.position.column + length - 1}
  };
}

let _to_lsp_position_che = (pos: IPosition): Position => {
  return {line: pos.line - 1, character: pos.column - 1};
};

let _get_range_che = (ps: IPositionedString): Range => {
   let length = ps.value.length;
  return {
      start: to_lsp_position(ps.position), 
      end: {line: ps.position.line - 1, character: ps.position.column + length - 1}
  };
}

export let to_lsp_position = (pos: IPosition): Position => {
  return _to_lsp_position_che(pos);
};

export let get_range = (ps: IPositionedString): Range => {
  return _get_range_che(ps);
};
