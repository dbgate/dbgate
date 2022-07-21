import { createPerspectiveConfig } from 'dbgate-datalib';
import { writable } from 'svelte/store';
import { onDestroy } from 'svelte';

function doLoadPerspectiveConfigFunc(tabid) {
  try {
    const existing = localStorage.getItem(`tabdata_perspective_${tabid}`);
    if (existing) {
      return {
        ...createPerspectiveConfig(),
        ...JSON.parse(existing),
      };
    }
  } catch (err) {
    console.warn('Error loading perspective config:', err.message);
  }
  return createPerspectiveConfig();
}

export default function usePerspectiveConfig(tabid) {
  const config = writable(doLoadPerspectiveConfigFunc(tabid));
  const unsubscribe = config.subscribe(value =>
    localStorage.setItem(`tabdata_perspective_${tabid}`, JSON.stringify(value))
  );
  onDestroy(unsubscribe);
  return config;
}

// export function usePerspectiveCache() {
//   const cache = writable({
//     tables: {},
//   });
//   return cache;
// }
