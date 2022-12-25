import { apiOn, transformApiArgsInv } from './api';
import getAsArray from './getAsArray';
import stableStringify from 'json-stable-stringify';

const cachedByKey = {};
const cachedPromisesByKey = {};
const cachedKeysByReloadTrigger = {};
const subscriptionsByReloadTrigger = {};
const cacheGenerationByKey = {};

let cacheGeneration = 0;

function cacheGet(key) {
  return cachedByKey[key];
}

function addCacheKeyToReloadTrigger(cacheKey, reloadTrigger) {
  for (const item of getAsArray(reloadTrigger)) {
    const itemString = stableStringify(item);
    if (!(itemString in cachedKeysByReloadTrigger)) {
      cachedKeysByReloadTrigger[itemString] = [];
    }
    cachedKeysByReloadTrigger[itemString].push(cacheKey);
  }
}

function cacheSet(cacheKey, value, reloadTrigger, generation) {
  cachedByKey[cacheKey] = value;
  addCacheKeyToReloadTrigger(cacheKey, reloadTrigger);
  delete cachedPromisesByKey[cacheKey];
  cacheGenerationByKey[cacheKey] = generation;
}

function cacheClean(reloadTrigger) {
  cacheGeneration += 1;
  for (const item of getAsArray(reloadTrigger)) {
    const itemString = stableStringify(transformApiArgsInv(item));
    const keys = cachedKeysByReloadTrigger[itemString];
    if (keys) {
      for (const key of keys) {
        delete cachedByKey[key];
        delete cachedPromisesByKey[key];
        cacheGenerationByKey[key] = cacheGeneration;
      }
    }
    delete cachedKeysByReloadTrigger[itemString];
  }
}

function getCachedPromise(reloadTrigger, cacheKey, func) {
  if (cacheKey in cachedPromisesByKey) return cachedPromisesByKey[cacheKey];
  const promise = func();
  cachedPromisesByKey[cacheKey] = promise;
  addCacheKeyToReloadTrigger(cacheKey, reloadTrigger);
  return promise;
}

function acquireCacheGeneration() {
  cacheGeneration += 1;
  return cacheGeneration;
}

function getCacheGenerationForKey(cacheKey) {
  return cacheGenerationByKey[cacheKey] || 0;
}

export async function loadCachedValue(reloadTrigger, cacheKey, func) {
  const fromCache = cacheGet(cacheKey);
  if (fromCache) {
    return fromCache;
  } else {
    const generation = acquireCacheGeneration();
    try {
      const res = await getCachedPromise(reloadTrigger, cacheKey, func);
      if (getCacheGenerationForKey(cacheKey) > generation) {
        return cacheGet(cacheKey) || res;
      } else {
        cacheSet(cacheKey, res, reloadTrigger, generation);
        return res;
      }
    } catch (err) {
      console.error('Error when using cached promise', err);
      // cacheClean(cacheKey);
      cacheClean(reloadTrigger);
      const res = await func();
      cacheSet(cacheKey, res, reloadTrigger, generation);
      return res;
    }
  }
}

export async function subscribeCacheChange(reloadTrigger, cacheKey, reloadHandler) {
  for (const item of getAsArray(reloadTrigger)) {
    const itemString = stableStringify(item);
    if (!subscriptionsByReloadTrigger[itemString]) {
      subscriptionsByReloadTrigger[itemString] = [];
    }
    subscriptionsByReloadTrigger[itemString].push(reloadHandler);
  }
}

export async function unsubscribeCacheChange(reloadTrigger, cacheKey, reloadHandler) {
  for (const item of getAsArray(reloadTrigger)) {
    const itemString = stableStringify(item);
    if (subscriptionsByReloadTrigger[itemString]) {
      subscriptionsByReloadTrigger[itemString] = subscriptionsByReloadTrigger[itemString].filter(
        x => x != reloadHandler
      );
    }
    if (subscriptionsByReloadTrigger[itemString].length == 0) {
      delete subscriptionsByReloadTrigger[itemString];
    }
  }
}

export function dispatchCacheChange(reloadTrigger) {
  cacheClean(reloadTrigger);

  for (const item of getAsArray(reloadTrigger)) {
    const itemString = stableStringify(transformApiArgsInv(item));
    if (subscriptionsByReloadTrigger[itemString]) {
      for (const handler of subscriptionsByReloadTrigger[itemString]) {
        handler();
      }
    }
  }
}

export function batchDispatchCacheTriggers(predicate) {
  for (const key in subscriptionsByReloadTrigger) {
    const relaodTrigger = JSON.parse(key);
    if (predicate(relaodTrigger)) {
      dispatchCacheChange(relaodTrigger);
    }
  }
}

apiOn('changed-cache', reloadTrigger => dispatchCacheChange(reloadTrigger));
