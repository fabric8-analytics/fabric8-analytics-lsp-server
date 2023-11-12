/* --------------------------------------------------------------------------------------------
 * Copyright (c) Red Hat
 * Licensed under the Apache-2.0 License. See License.txt in the project root for license information.
 * ------------------------------------------------------------------------------------------ */
'use strict';

import { Range } from 'vscode-languageserver';

/* Line and column inside the JSON file */
export interface IPosition {
  line: number;
  column: number;
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

/* Dependency class that can be created from `IKeyValueEntry` */
export class Dependency implements IDependency {
  constructor(
    public name: IPositionedString,
    public version: IPositionedString = {} as IPositionedString,
    public context: IPositionedContext = {} as IPositionedContext,
  ) {}
}

export class DependencyMap {
  mapper: Map<string, IDependency>;
  constructor(deps: IDependency[]) {
    this.mapper = new Map(deps.map(d => [d.name.value, d]));
  }

  public get(key: string): IDependency {
    return this.mapper.get(key);
  }
}

/* Ecosystem provider interface */
export interface IDependencyProvider {
  collect(contents: string): Promise<IDependency[]>;
  resolveDependencyFromReference(ref: string): string;
}

export class EcosystemDependencyResolver {
  private ecosystem: string;

  constructor(ecosystem: string) {
    this.ecosystem = ecosystem;
  }

  resolveDependencyFromReference(ref: string): string {
    return ref.replace(`pkg:${this.ecosystem}/`, '');
  }
}