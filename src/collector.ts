/* --------------------------------------------------------------------------------------------
 * Copyright (c) Red Hat
 * Licensed under the Apache-2.0 License. See License.txt in the project root for license information.
 * ------------------------------------------------------------------------------------------ */
'use strict';

import { Range } from 'vscode-languageserver';
import { isDefined } from './utils';

/**
 * Represents a position inside the manifest file with line and column information.
 */
export interface IPosition {
  line: number;
  column: number;
}

/**
 * Represents a string value with associated position information.
 */
export interface IPositionedString {
  value: string;
  position: IPosition;
}

/**
 * Represents a context with a string value and its associated range.
 */
export interface IPositionedContext {
  value: string;
  range: Range;
}

/**
 * Represents a dependency specification.
 */
export interface IDependency {
  name: IPositionedString;
  version: IPositionedString;
  context: IPositionedContext;
}

/**
 * Represents a dependency and implements the IDependency interface.
 */
export class Dependency implements IDependency {
  public version: IPositionedString;
  public context: IPositionedContext;
  
  constructor(
    public name: IPositionedString
  ) {}
}

/**
 * Retrieves the range of a dependency version or context within a text document.
 * @param dep - The dependency object containing version and context information.
 * @returns The range within the text document that represents the dependency.
 */
export function getRange (dep: IDependency): Range {
  
  if (isDefined(dep, 'version', 'position')) {
    const pos: IPosition = dep.version.position;
    const length = dep.version.value.length;
    return {
      start: {
        line: pos.line - 1, 
        character: pos.column - 1
      },
      end: {
        line: pos.line - 1, 
        character: pos.column + length - 1}
    };
  } else {
    return dep.context.range;
  }
}

/**
 * Represents a map of dependencies using dependency name as key for easy retrieval of associated details.
 */
export class DependencyMap {
  mapper: Map<string, IDependency>;
  constructor(deps: IDependency[]) {
    this.mapper = new Map(deps.map(d => [d.name.value, d]));
  }

  /**
   * Retrieves a dependency by its unique name key.
   * @param key - The unique name key for the desired dependency.
   * @returns The dependency object linked to the specified unique name key.
   */
  public get(key: string): IDependency {
    return this.mapper.get(key);
  }
}

/**
 * Represents an interface for providing ecosystem-specific dependencies.
 */
export interface IDependencyProvider {

  /**
   * Collects dependencies from the provided manifest contents.
   * @param contents - The manifest contents to collect dependencies from.
   * @returns A Promise resolving to an array of dependencies.
   */
  collect(contents: string): Promise<IDependency[]>;

  /**
   * Resolves a dependency reference to its actual name in the ecosystem.
   * @param ref - The reference string to resolve.
   * @returns The resolved name of the dependency.
   */
  resolveDependencyFromReference(ref: string): string;
}

/**
 * Represents a resolver for ecosystem-specific dependencies.
 */
export class EcosystemDependencyResolver {
  private ecosystem: string;

  constructor(ecosystem: string) {
    this.ecosystem = ecosystem;
  }

  /**
   * Resolves a dependency reference in a specified ecosystem to its name and version string.
   * @param ref - The reference string to resolve.
   * @returns The resolved name of the dependency.
   */
  resolveDependencyFromReference(ref: string): string {
    return ref.replace(`pkg:${this.ecosystem}/`, '');
  }
}