import { createGridConfig } from 'dbgate-datalib';
import { writable } from 'svelte/store';
import { onDestroy } from 'svelte';

const loadGridConfigFunc = tabid => () => {
  const existing = localStorage.getItem(`tabdata_grid_${tabid}`);
  if (existing) {
    return {
      ...createGridConfig(),
      ...JSON.parse(existing),
    };
  }
  return createGridConfig();
};

export default function useGridConfig(tabid) {
  const config = writable(loadGridConfigFunc(tabid));
  const unsubscribe = config.subscribe(value => localStorage.setItem(`tabdata_grid_${tabid}`, JSON.stringify(value)));
  onDestroy(unsubscribe)
  return config;
}
