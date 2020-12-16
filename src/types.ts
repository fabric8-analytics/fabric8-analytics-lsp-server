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

  constructor(k: string, pos: IPosition, v?: IVariant, v_pos?: IPosition) {
    this.key = k;
    this.key_position = pos;
    this.value = v;
    this.value_position = v_pos;
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
  /* key shall be used as key in Map */
  key(): string;
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

export { IPosition, IKeyValueEntry, KeyValueEntry, Variant, ValueType, IDependency, IPositionedString, IDependencyCollector, Dependency };
