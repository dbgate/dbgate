import { getContext } from 'svelte';
import { get_current_component, onMount, setContext } from 'svelte/internal';
import invalidateCommands from '../commands/invalidateCommands';

const lastActiveDictionary = {};

export default function createActivator(name, activateOnTabVisible) {
  const instance = get_current_component();
  const tabVisible: any = getContext('tabVisible');
  const tabid = getContext('tabid');
  const parentActivatorInstance = getContext('parentActivatorInstance') as any;
  setContext('parentActivatorInstance', instance);
  let tabVisibleValue;

  onMount(() => {
    const unsubscribeTabVisible = tabVisible.subscribe(value => {
      tabVisibleValue = value;
      if (activateOnTabVisible) {
        activate();
      }
    });
    invalidateCommands();

    return () => {
      unsubscribeTabVisible();
    };
  });

  const activate = () => {
    lastActiveDictionary[name] = instance;
    if (parentActivatorInstance) {
      parentActivatorInstance.activator.activate();
    }
  };

  const getTabVisible = () => tabVisibleValue;

  return {
    activate,
    tabid,
    getTabVisible,
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
