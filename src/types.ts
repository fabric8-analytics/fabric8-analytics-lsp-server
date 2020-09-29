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

/* Generic token interface, although currently we're going to use only IToken<string> */
interface IToken<T> {
    value: T;
    line:  number;
    pos:   number;
}

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


export { IPosition, IKeyValueEntry, KeyValueEntry, Variant, ValueType };

