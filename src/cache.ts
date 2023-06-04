'use strict';

import { LRUCache } from 'lru-cache';
import { IHashableDependency, SimpleDependency } from './collector';

export interface CachedItem {
  K: IHashableDependency;
  V: any;
}

export class Cache {
  private cache: LRUCache<string, any>;

  constructor(max: number, ttl: number) {
    this.cache = new LRUCache<string, any>({max, ttl});
  }

  // returns null as a value for dependency which is not in the cache.
  get(deps: Array<IHashableDependency>): Array<CachedItem> {
    return deps.map(d => {
      const key = d.key();
      const cached = this.cache.get(key.substring(0, key.lastIndexOf(':')));
      return {K: d, V: cached} as CachedItem;
    });
  }

  add(items: Array<any>): void {
    items.forEach(item => {
      // FIXME: response field is inconsistent when unknown is included.
      const dep = new SimpleDependency(item.package || item.name || item.ref.name, item.version || item.ref.version);
      this.cache.set(dep.key(), item);
    });
  }
}

export const globalCache = (() => {
  const cache = new Map<string, Cache>();
  return (key, max, maxAge) => {
    const c = cache.get(key) ?? cache.set(key, new Cache(max, maxAge)).get(key);
    return c;
  };
})();
