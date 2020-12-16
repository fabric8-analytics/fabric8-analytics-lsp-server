/* --------------------------------------------------------------------------------------------
 * Copyright (c) Pavel Odvody 2016
 * Licensed under the Apache-2.0 License. See License.txt in the project root for license information.
 * ------------------------------------------------------------------------------------------ */
'use strict';

/* Determine what is the value */
enum ValueType {
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
interface IVariant {
  type:   ValueType;
  object: any;
}

/* Line and column inside the JSON file */
interface IPosition {
  line:   number;
  column: number;
};

/* Key/Value entry with positions */
interface IKeyValueEntry {
  key:            string;
  value:          IVariant;
  key_position:   IPosition;
  value_position: IPosition;
};

class KeyValueEntry implements IKeyValueEntry {
  key:            string;
  value:          IVariant;
  key_position:   IPosition;
  value_position: IPosition;

  constructor(k: string, pos: IPosition) {
    this.key = k;
    this.key_position = pos;
  }
}

class Variant implements IVariant {
    constructor(public type: ValueType, public object: any) {}
}

/* String value with position */
interface IPositionedString {
  value:    string;
  position: IPosition;
}

/* Dependency specification */
interface IDependency {
  name:    IPositionedString;
  version: IPositionedString;
}

/* Dependency collector interface */
interface IDependencyCollector {
  classes: Array<string>;
  collect(contents: string): Promise<Array<IDependency>>;
}

/* Dependency class that can be created from `IKeyValueEntry` */
class Dependency implements IDependency {
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
}

export { IPosition, IKeyValueEntry, KeyValueEntry, Variant, ValueType, IDependency, IPositionedString, IDependencyCollector, Dependency };
