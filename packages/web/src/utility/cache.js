let cachedByKey = {};
let cachedPromisesByKey = {};
const cachedKeysByReloadTrigger = {};

export function cacheGet(key) {
  return cachedByKey[key];
}

export function cacheSet(key, value, reloadTrigger) {
  cachedByKey[key] = value;
  if (!(reloadTrigger in cachedKeysByReloadTrigger)) {
    cachedKeysByReloadTrigger[reloadTrigger] = [];
  }
  cachedKeysByReloadTrigger[reloadTrigger].push(key);
  delete cachedPromisesByKey[key];
}

export function cacheClean(reloadTrigger) {
  const keys = cachedKeysByReloadTrigger[reloadTrigger];
  if (keys) {
    for (const key of keys) {
      delete cachedByKey[key];
      delete cachedPromisesByKey[key];
    }
  }
  delete cachedKeysByReloadTrigger[reloadTrigger];
}

export function getCachedPromise(key, func) {
  if (key in cachedPromisesByKey) return cachedPromisesByKey[key];
  const promise = func();
  cachedPromisesByKey[key] = promise;
  return promise;
}
