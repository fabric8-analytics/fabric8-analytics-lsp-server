/* --------------------------------------------------------------------------------------------
 * Copyright (c) Red Hat
 * Licensed under the Apache-2.0 License. See License.txt in the project root for license information.
 * ------------------------------------------------------------------------------------------ */
'use strict';

/**
 * Checks if the specified keys are defined within the provided object.
 * @param obj - The object to check for key definitions.
 * @param keys - The keys to check for within the object.
 * @returns A boolean indicating whether all specified keys are defined within the object.
 */
export function isDefined(obj: any, ...keys: string[]): boolean {
  for (const key of keys) {
      if (!obj || !obj[key]) {
          return false;
      }
      obj = obj[key];
  }
  return true;
}

/**
 * Decodes the URI path from a given URI string.
 * @param uri - The URI string to process.
 * @returns The decoded URI path.
 */
export function decodeUriPath(uri: string): string {
  const url = new URL(uri);
  const decodedUri = decodeURIComponent(url.pathname);
  return decodedUri;
}