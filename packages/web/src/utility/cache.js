import getAsArray from './getAsArray';

let cachedByKey = {};
let cachedPromisesByKey = {};
const cachedKeysByReloadTrigger = {};

export function cacheGet(key) {
  return cachedByKey[key];
}

export function cacheSet(key, value, reloadTrigger) {
  cachedByKey[key] = value;
  for (const item of getAsArray(reloadTrigger)) {
    if (!(item in cachedKeysByReloadTrigger)) {
      cachedKeysByReloadTrigger[item] = [];
    }
    cachedKeysByReloadTrigger[item].push(key);
  }
  delete cachedPromisesByKey[key];
}

export function cacheClean(reloadTrigger) {
  for (const item of getAsArray(reloadTrigger)) {
    const keys = cachedKeysByReloadTrigger[item];
    if (keys) {
      for (const key of keys) {
        delete cachedByKey[key];
        delete cachedPromisesByKey[key];
      }
    }
    delete cachedKeysByReloadTrigger[item];
  }
}

export function getCachedPromise(key, func) {
  if (key in cachedPromisesByKey) return cachedPromisesByKey[key];
  const promise = func();
  cachedPromisesByKey[key] = promise;
  return promise;
}
