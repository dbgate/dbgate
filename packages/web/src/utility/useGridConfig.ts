import { createGridConfig } from 'dbgate-datalib';
import { writable } from 'svelte/store';
import { onDestroy } from 'svelte';

function doLoadGridConfigFunc(tabid) {
  try {
    const existing = localStorage.getItem(`tabdata_grid_${tabid}`);
    if (existing) {
      return {
        ...createGridConfig(),
        ...JSON.parse(existing),
      };
    }
  } catch (err) {
    console.warn('Error loading grid config:', err.message);
  }
  return createGridConfig();
}

export default function useGridConfig(tabid) {
  const config = writable(doLoadGridConfigFunc(tabid));
  const unsubscribe = config.subscribe(value => localStorage.setItem(`tabdata_grid_${tabid}`, JSON.stringify(value)));
  onDestroy(unsubscribe);
  return config;
}
