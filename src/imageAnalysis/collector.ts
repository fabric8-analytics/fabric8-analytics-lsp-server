/* --------------------------------------------------------------------------------------------
 * Copyright (c) Red Hat
 * Licensed under the Apache-2.0 License. See License.txt in the project root for license information.
 * ------------------------------------------------------------------------------------------ */
'use strict';

import { Range } from 'vscode-languageserver';

import { IPositionedString, IPosition } from '../positionTypes';

/**
 * Represents a context with a string value and its associated range.
 */
export interface IImage {
  name: IPositionedString;
  line: string;
  platform: string;
}

/**
 * Represents a dependency and implements the IDependency interface.
 */
export class Image implements IImage {
  public platform: string;
  
  constructor(
    public name: IPositionedString,
    public line: string
  ) {}
}

/**
 * Represents an interface for providing ecosystem-specific dependencies.
 */
export interface IImageProvider {

  /**
   * Collects dependencies from the provided manifest contents.
   * @param contents - The manifest contents to collect dependencies from.
   * @returns A Promise resolving to an array of dependencies.
   */
  collect(contents: string): Promise<IImage[]>;
}

/**
 * Represents a map of dependencies using dependency name as key for easy retrieval of associated details.
 */
export class ImageMap {
  mapper: Map<string, IImage[]>;
  constructor(images: IImage[]) {
    this.mapper = new Map();

    images.forEach(image => {
      const nameValue = image.name.value;
      if (this.mapper.has(nameValue)) {
          this.mapper.get(nameValue).push(image);
      } else {
          this.mapper.set(nameValue, [image]);
      }
    });
  }

  /**
   * Retrieves a dependency by its unique name key.
   * @param key - The unique name key for the desired dependency.
   * @returns The dependency object linked to the specified unique name key.
   */
  public get(key: string): IImage[] {
    const images: IImage[] = [];
    /* istanbul ignore else */
    if (this.mapper.has(key)) {
        images.push(...this.mapper.get(key));
    }

    // Check if the key includes ":latest"
    if (key.includes(':latest')) {
        const keyWithoutLatest = key.replace(':latest', '');
        /* istanbul ignore else */
        if (this.mapper.has(keyWithoutLatest)) {
            images.push(...this.mapper.get(keyWithoutLatest));
        }
    }

    return images;
  }
}

/**
 * Retrieves the range of a dependency version or context within a text document.
 * @param dep - The dependency object containing version and context information.
 * @returns The range within the text document that represents the dependency.
 */
export function getRange (img: IImage): Range {
  const pos: IPosition = img.name.position;
  const length = img.line.length;

  return {
    start: {
      line: pos.line - 1, 
      character: pos.column
    },
    end: {
      line: pos.line - 1,
      character: pos.column + length
    }
  };
}