'use strict';

import { expect } from 'chai';
import { Cache, globalCache } from '../src/cache';
import { SimpleDependency } from '../src/collector';

describe('LRU Cache test', () => {

  const deps: Array<SimpleDependency> = [
    new SimpleDependency('foo', '1.0'),
    new SimpleDependency('bar', '2.0')
  ];

  it('classification on empty cache, empty input', async () => {
    const cache = new Cache(10, 10000);
    const {cachedValues, missedItems} = cache.classify([]);
    expect(cachedValues).is.empty;
    expect(missedItems).is.empty;
  });

  it('classification on empty cache, valid input', async () => {
    const cache = new Cache(10, 10000);
    const {cachedValues, missedItems} = cache.classify(deps);
    expect(cachedValues).is.empty;
    expect(missedItems).is.eql(deps);
  });

  it('classification on cache with 1 value', async () => {
    const cache = new Cache(10, 10000);

    const response: Array<any> = [
      {package: 'foo', version: '1.0', extra: "got it!"}
    ];
    cache.add(response);

    const {cachedValues, missedItems} = cache.classify(deps);
    expect(cachedValues).is.eql([response[0]]);
    expect(missedItems).is.eql([deps[1]]);
  });

  it('classification on cache with all values', async () => {
    const cache = new Cache(10, 10000);

    const response: Array<any> = [
      {package: 'foo', version: '1.0', extra: "got foo@1.0"},
      {package: 'bar', version: '2.0', extra: "got bar@2.0"}
    ];
    cache.add(response);

    const {cachedValues, missedItems} = cache.classify(deps);
    expect(cachedValues).is.eql(response);
    expect(missedItems).is.empty;
  });

  it('classification on cache after cache expiry', async () => {
    const cache = new Cache(10, 1);

    const response: Array<any> = [
      {package: 'foo', version: '1.0', extra: "got foo@1.0"},
      {package: 'bar', version: '2.0', extra: "got bar@2.0"}
    ];
    cache.add(response);
    // wait for the cache to expiry.
    await new Promise(r => setTimeout(r, 11));
    const {cachedValues, missedItems} = cache.classify(deps);
    expect(cachedValues).is.empty;
    expect(missedItems).is.eql(deps);
  });

  it('globalCache check', () => {
    const abc = globalCache('abc', 0, 0);
    const xyz = globalCache('xyz', 0, 0);
    expect(abc).to.equal(globalCache('abc', 10, 20));
    expect(xyz).to.equal(globalCache('xyz', 10, 20));
    expect(abc).not.to.equal(globalCache('xyz', 10, 20));
    expect(xyz).not.to.equal(globalCache('abc', 10, 20));
    expect(abc).not.to.equal(xyz);
  });
});
