'use strict';

import LRUCache from 'lru-cache';
import { IHashableDependency, SimpleDependency } from './collector';

type CachedItems = {cachedValues: Array<any>, missedItems: Array<IHashableDependency>};

export class Cache {
  private cache: LRUCache<string, any>;

  constructor(max: number, maxAge: number) {
    this.cache = new LRUCache<string, any>({max, maxAge});
  }

  // returns cachedValues and non cached items.
  classify(deps: Array<IHashableDependency>): CachedItems {
    const cachedValues = Array<any>();
    const missedItems = Array<IHashableDependency>();
    deps.forEach(d => {
      const cached = this.cache.get(d.key());
      if (cached) {
        cachedValues.push(cached);
      } else {
        missedItems.push(d);
      }
    });
    return {cachedValues, missedItems};
  }

  add(items: Array<any>): void {
    items.forEach(item => {
      const dep = new SimpleDependency(item.package, item.version);
      this.cache.set(dep.key(), item);
    });
  }
}

export const globalCache = (() => {
  const cache = new Map<string, Cache>();
  return (key, max, maxAge) => {
    const c = cache.get(key) ?? new Cache(max, maxAge);
    cache.has(key) || cache.set(key, c);
    return c;
  };
})();
