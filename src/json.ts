/* --------------------------------------------------------------------------------------------
 * Copyright (c) Pavel Odvody 2016
 * Licensed under the Apache-2.0 License. See License.txt in the project root for license information.
 * ------------------------------------------------------------------------------------------ */
'use strict';
import { Stream } from 'stream';
/* Since the following modules are written in regular JS we can't use TS's import statement
   so we need to `require` those the JS way */
let Parser   = require("stream-json/ClassicParser"),
    Streamer = require("stream-json/Streamer"),
    Emitter  = require("stream-json/Emitter"),
    Packer   = require("stream-json/Packer");

/* Determine to which class the emitted token belongs */
enum TokenMarker {
  Invalid,
  Key,
  Value
};

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

/* Called when the parser is finished */
interface IStreamingParserCallback {
  (scope: IJsonParserScope): void;
}

/* Scope that is used to group the raw events emitted by the parser
   depending on the state of the scope */
interface IJsonParserScope {
  children:   Array<IJsonParserScope>;
  last:       IKeyValueEntry;
  parent:     IJsonParserScope;
  properties: Array<IKeyValueEntry>;
  marker:     TokenMarker;

  add_scope(): IJsonParserScope;
  consume<T>(token: IToken<T>): void;
  leave(): IJsonParserScope;
  print(): void;
};

/* Parse the document with a callback when finished */
interface IStreamingParser {
  parse(): Promise<IJsonParserScope>;
}


class Variant implements IVariant {
    constructor(public type: ValueType, public object: any) {}
}

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

class Scope implements IJsonParserScope {
  children:   Array<IJsonParserScope>;
  last:       IKeyValueEntry;
  parent:     IJsonParserScope;
  properties: Array<IKeyValueEntry>;
  marker:     TokenMarker;

  constructor(parent?: IJsonParserScope) {
    this.children = [];
    this.properties = [];
    this.parent = parent;
    this.marker = TokenMarker.Invalid;
    this.last = null;
  }

  add_scope() {
    let new_scope = new Scope(this);
    this.children.push(new_scope);
    /* We're creating a new scope, but since the current key has
       undefined value it means the new scope (or the contents therein) *is* the value */
    if (this.last !== null && this.last.value == undefined) {
      this.last.value = new Variant(ValueType.Object, new_scope.properties);
      this.properties.push(this.last);
    }
    return new_scope;
  }

  consume(token: IToken<string>) {
    switch (this.marker) {
    case TokenMarker.Key:
      this.last = new KeyValueEntry(token.value, {line: token.line, column: token.pos});
      this.marker = TokenMarker.Invalid;
      break;
    case TokenMarker.Value:
      this.last.value = new Variant(ValueType.String, token.value);
      this.last.value_position = {line: token.line, column: token.pos};
      this.properties.push(this.last);
      this.marker = TokenMarker.Invalid;
      break;
    default:
      break;
    }
  }

  leave() {
    return this.parent;
  }

  /* used mainly for debug purposes */
  print() {
    console.log(this.properties);
    this.children.forEach((scope: IJsonParserScope) => { scope.print() });
  }
};


class StreamingParser implements IStreamingParser {
  file: Stream;

  constructor(file: Stream) {
      this.file = file;
  }

  async parse(): Promise<IJsonParserScope> {
    let scope = new Scope(), parser = new Parser(), stream = new Streamer(), emitter = new Emitter(),
        packer = new Packer({packKeys: true, packStrings: true, packNumbers: true});
    let root = scope;
    /* In the following code we observe two event streams, one defined by parser
    and the other one by emitter. The difference here is that parser produces raw tokens
    with positional information as to where in the file the token is declared, but since
    this stream is very low level and contains tokens like ", [, ] etc. we need to correlate
    events from this stream with the events produced by the emitter stream which gives
    us much finer granularity in handling the underlying JSON structure.
    
    The correlation of the events itself is handled by the `Scope` which in essence
    implements a finite state machine to make sense of the two event streams. */
    parser.on("data", function(x) {
      if (scope.marker != TokenMarker.Invalid) {
        scope.consume(x);
      }
    });
    parser.on("error", function (e) {
      // the JSON document doesn't have to be well-formed, that's fine
    });

    emitter.on("startKey", function(/*e*/) { scope.marker = TokenMarker.Key; });
    /* We don't care about numbers, nulls, arrays and booleans thus far */
    emitter.on("startString", function() { scope.marker = TokenMarker.Value; });
    emitter.on("startObject", function() { scope = scope.add_scope(); });
    emitter.on("endObject", function() { scope = scope.leave(); });

    this.file
      .pipe(parser)
      .pipe(stream)
      .pipe(packer)
      .pipe(emitter);

    return new Promise<IJsonParserScope>(resolve => {
      emitter.on("finish", () => resolve(root));
    });
  }
};

export { StreamingParser, IJsonParserScope, IPosition, IKeyValueEntry, KeyValueEntry, Variant, ValueType };
