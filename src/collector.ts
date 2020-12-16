/* --------------------------------------------------------------------------------------------
 * Copyright (c) Pavel Odvody 2016
 * Licensed under the Apache-2.0 License. See License.txt in the project root for license information.
 * ------------------------------------------------------------------------------------------ */
'use strict';

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
};

/* Value variant */
export interface IVariant {
  type:   ValueType;
  object: any;
}

/* Line and column inside the JSON file */
export interface IPosition {
  line:   number;
  column: number;
};

/* Key/Value entry with positions */
export interface IKeyValueEntry {
  key:            string;
  value:          IVariant;
  key_position:   IPosition;
  value_position: IPosition;
};

export class KeyValueEntry implements IKeyValueEntry {
  key:            string;
  value:          IVariant;
  key_position:   IPosition;
  value_position: IPosition;

  constructor(k: string, pos: IPosition, v?: IVariant, v_pos?: IPosition) {
    this.key = k;
    this.key_position = pos;
    this.value = v;
    this.value_position = v_pos;
  }
}

export class Variant implements IVariant {
  constructor(public type: ValueType, public object: any) {}
}

/* String value with position */
export interface IPositionedString {
  value:    string;
  position: IPosition;
}

/* Dependency specification */
export interface IDependency {
  name: IPositionedString;
  version: IPositionedString;
}

export interface IHashableDependency extends IDependency {
  key(): string;
}

/* Dependency collector interface */
export interface IDependencyCollector {
  classes: Array<string>;
  collect(contents: string): Promise<Array<IDependency>>;
}

/* Dependency class that can be created from `IKeyValueEntry` */
export class Dependency implements IHashableDependency {
  name:    IPositionedString;
  version: IPositionedString;
  constructor(dependency: IKeyValueEntry) {
    this.name = {
      value: dependency.key,
      position: dependency.key_position
    };
    this.version = {
      value: dependency.value.object,
      position: dependency.value_position
    };
  }

  key(): string {
    return `${this.name.value}@${this.version.value}`;
  }
}

/* Dependency from name, version without position */
export class SimpleDependency extends Dependency {
  constructor(name: string, version: string) {
    super(new KeyValueEntry(name, null, new Variant(ValueType.String, version), null));
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
