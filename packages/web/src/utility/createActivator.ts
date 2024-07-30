import { getContext } from 'svelte';
import { get_current_component, onMount, setContext } from 'svelte/internal';
import invalidateCommands from '../commands/invalidateCommands';
import { writable } from 'svelte/store';

const lastActiveDictionary = {};

export const isComponentActiveStore = writable((key: string, component) => false as boolean);

function isParent(parent, child) {
  while (child && child.activator) {
    if (parent == child) return true;
    child = child.activator.parentActivatorInstance;
  }
  return false;
}

export default function createActivator(
  name: string,
  activateOnTabVisible: boolean = false,
  friendActivators: string[] = []
) {
  const instance = get_current_component();
  const tabVisible: any = getContext('tabVisible');
  const tabid = getContext('tabid');
  const parentActivatorInstance = getContext('parentActivatorInstance') as any;
  setContext('parentActivatorInstance', instance);
  let tabVisibleValue;

  onMount(() => {
    if (tabVisible) {
      const unsubscribeTabVisible = tabVisible.subscribe(value => {
        tabVisibleValue = value;
        if (activateOnTabVisible && tabVisibleValue) {
          activate();
        }
      });
      invalidateCommands();

      return () => {
        unsubscribeTabVisible();
      };
    }
  });

  const activate = () => {
    const toDelete = [];

    // console.log('ACTIVATE', instance);

    for (const key in lastActiveDictionary) {
      if (isParent(lastActiveDictionary[key], instance)) continue;
      if (isParent(instance, lastActiveDictionary[key])) continue;
      if (friendActivators.includes(key)) continue;

      toDelete.push(key);
    }

    // console.log('toDelete', toDelete);

    for (const del of toDelete) {
      delete lastActiveDictionary[del];
    }
    lastActiveDictionary[name] = instance;
    if (parentActivatorInstance) {
      parentActivatorInstance.activator.activate();
    }
    // console.log('Active components', lastActiveDictionary);

    isComponentActiveStore.set((key, component) => {
      return lastActiveDictionary[key] == component;
    });
  };

  const getTabVisible = () => tabVisibleValue;

  return {
    activate,
    tabid,
    getTabVisible,
    parentActivatorInstance,
  };
}

export function getActiveComponent(name) {
  const current = lastActiveDictionary[name];
  if (!current) return null;
  if (!current.activator) return null;
  if (!current.activator.getTabVisible) return null;
  if (!current.activator.getTabVisible()) return null;
  return current;
}
