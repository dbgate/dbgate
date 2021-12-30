const cache = {};

export function getLocalStorage(key, defaultValue = undefined) {
  if (key in cache) return cache[key];
  const item = localStorage.getItem(key);
  if (item) {
    try {
      const res = JSON.parse(item);
      cache[key] = res;
      return res;
    } catch (e) {
      return defaultValue;
    }
  }
  return defaultValue;
}

export function setLocalStorage(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
  delete cache[key];
}

export function removeLocalStorage(key) {
  localStorage.removeItem(key);
  delete cache[key];
}
