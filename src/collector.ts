/* --------------------------------------------------------------------------------------------
 * Copyright (c) Red Hat
 * Licensed under the Apache-2.0 License. See License.txt in the project root for license information.
 * ------------------------------------------------------------------------------------------ */
'use strict';

import { Range } from 'vscode-languageserver';

/* Determine what is the value */
export enum ValueType {
  Invalid,
  String,
  Integer,
  Float,
  Array,
  Object,
  Boolean,
  Null
}

/* Value variant */
export interface IVariant {
  type: ValueType;
  object: any;
}

/* Line and column inside the JSON file */
export interface IPosition {
  line: number;
  column: number;
}

/* Key/Value entry with positions */
export interface IKeyValueEntry {
  key: string;
  value: IVariant;
  keyPosition: IPosition;
  valuePosition: IPosition;
  context: string;
  contextRange: Range;
}

export class KeyValueEntry implements IKeyValueEntry {
  key: string;
  value: IVariant;
  keyPosition: IPosition;
  valuePosition: IPosition;
  context: string;
  contextRange: Range;

  constructor(k: string, pos: IPosition, v?: IVariant, vPos?: IPosition, c?: string, cRange?: Range) {
    this.key = k;
    this.keyPosition = pos;
    this.value = v;
    this.valuePosition = vPos;
    this.context = c;
    this.contextRange = cRange;
  }
}

export class Variant implements IVariant {
  constructor(
    public type: ValueType, 
    public object: any
  ) { }
}

/* String value with position */
export interface IPositionedString {
  value: string;
  position: IPosition;
}

export interface IPositionedContext {
  value: string;
  range: Range;
}

/* Dependency specification */
export interface IDependency {
  name: IPositionedString;
  version: IPositionedString;
  context: IPositionedContext;
}

export interface IHashableDependency extends IDependency {
  key(): string;
}

/* Ecosystem provider interface */
export interface IDependencyProvider {
  ecosystem: string;
  classes: Array<string>;
  collect(contents: string): Promise<Array<IDependency>>;
}

/* Dependency class that can be created from `IKeyValueEntry` */
export class Dependency implements IHashableDependency {
  name: IPositionedString;
  version: IPositionedString;
  context: IPositionedContext;
  constructor(dependency: IKeyValueEntry) {
    this.name = {
      value: dependency.key,
      position: dependency.keyPosition
    };
    this.version = {
      value: dependency.value.object,
      position: dependency.valuePosition
    };
    if (dependency.context && dependency.contextRange) {
      this.context = {
        value: dependency.context,
        range: dependency.contextRange
      };
    }
  }

  key(): string {
    return `${this.name.value}`;
  }
}

export class DependencyMap {
  mapper: Map<string, IHashableDependency>;
  constructor(deps: Array<IHashableDependency>) {
    this.mapper = new Map(deps.map(d => [d.key(), d]));
  }

  public get(key: string): IHashableDependency {
    return this.mapper.get(key);
  }
}
