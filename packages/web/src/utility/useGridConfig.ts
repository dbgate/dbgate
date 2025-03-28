import { createGridConfig } from 'dbgate-datalib';
import { writable } from 'svelte/store';
import { onDestroy } from 'svelte';
import { getOpenedTabs, openedTabs } from '../stores';
import _ from 'lodash';

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

function containsNotEmptyObject(obj) {
  for (const key of Object.keys(obj)) {
    if (!_.isEmpty(obj[key])) {
      return true;
    }
  }
  return false;
}

export default function useGridConfig(tabid) {
  const config = writable(doLoadGridConfigFunc(tabid));
  const unsubscribe = config.subscribe(value => {
    localStorage.setItem(`tabdata_grid_${tabid}`, JSON.stringify(value));

    if (containsNotEmptyObject(value)) {
      if (getOpenedTabs().find(x => x.tabid == tabid)?.tabPreviewMode) {
        openedTabs.update(tabs =>
          tabs.map(x =>
            x.tabid == tabid
              ? {
                  ...x,
                  tabPreviewMode: false,
                }
              : x
          )
        );
      }
    }
  });
  onDestroy(unsubscribe);
  return config;
}
