import _ from 'lodash';
import { writable, derived } from 'svelte/store';
import { onMount, onDestroy } from 'svelte';
import localforage from 'localforage';
import { changeTab } from '../utility/common';

function getParsedLocalStorage(key) {
  const value = localStorage.getItem(key);
  if (value != null) {
    try {
      const res = JSON.parse(value);
      return res;
    } catch (e) {
      // console.log('FAILED LOAD FROM STORAGE', e);
      // console.log('VALUE', value);
      localStorage.removeItem(key);
    }
  }
  return null;
}

const saveHandlersList = [];

export default function useEditorData({ tabid, reloadToken = 0, loadFromArgs = null, onInitialData = null }) {
  const localStorageKey = `tabdata_editor_${tabid}`;
  let changeCounter = 0;
  let savedCounter = 0;

  const editorState = writable({
    errorMessage: null,
    isLoading: true,
    value: null,
  });

  const editorValue = derived(editorState, $state => $state.value);

  let value = null;

  // const valueRef = React.useRef(null);

  const initialLoad = async () => {
    if (loadFromArgs) {
      try {
        const init = await loadFromArgs();
        changeTab(tabid, tab => ({
          ...tab,
          props: _.omit(tab.props, ['initialArgs']),
        }));
        editorState.update(x => ({
          ...x,
          value: init,
        }));
        if (onInitialData) onInitialData(init);
        value = init;
        // mark as not saved
        changeCounter += 1;
      } catch (err) {
        const message =
          (err && err.response && err.response.data && err.response.data.error) || err.message || 'Loading failed';
        editorState.update(x => ({
          ...x,
          errorMessage: message,
        }));
        console.error(err.response || err.message);
      }
    } else {
      const initFallback = getParsedLocalStorage(localStorageKey);
      if (initFallback != null) {
        editorState.update(x => ({
          ...x,
          value: initFallback,
        }));
        if (onInitialData) onInitialData(initFallback);
        value = initFallback;
        // move to local forage
        await localforage.setItem(localStorageKey, initFallback);
        localStorage.removeItem(localStorageKey);
      } else {
        const init = await localforage.getItem(localStorageKey);
        if (init) {
          editorState.update(x => ({
            ...x,
            value: init,
          }));
          if (onInitialData) onInitialData(init);
          value = init;
        }
      }
    }
    editorState.update(x => ({
      ...x,
      isLoading: false,
    }));
  };

  const saveToStorageIfNeeded = async () => {
    if (savedCounter == changeCounter) return; // all saved
    await saveToStorage();
  };

  const saveToStorage = async () => {
    if (value == null) return;
    try {
      await localforage.setItem(localStorageKey, value);
      localStorage.removeItem(localStorageKey);
      savedCounter = changeCounter;
    } catch (err) {
      console.error(err);
    }
  };

  const saveToStorageSync = () => {
    if (value == null) return;
    if (savedCounter == changeCounter) return; // all saved
    // on window unload must be synchronous actions, save to local storage instead
    localStorage.setItem(localStorageKey, JSON.stringify(value));
  };

  const saveToStorageDebounced = _.debounce(saveToStorage, 5000);

  const setEditorData = newValue => {
    if (_.isFunction(newValue)) {
      value = newValue(value);
    } else {
      if (newValue != null) value = newValue;
    }
    editorState.update(x => ({
      ...x,
      value,
    }));

    changeCounter += 1;
    saveToStorageDebounced();
  };

  const clearEditorData = async () => {
    await localforage.removeItem(localStorageKey);
    localStorage.removeItem(localStorageKey);
    value = null;
    editorState.update(x => ({
      ...x,
      value: null,
      errorMessage: null,
      isLoading: false,
    }));
  };

  onMount(() => {
    window.addEventListener('beforeunload', saveToStorageSync);
    initialLoad();
    saveHandlersList.push(saveToStorageIfNeeded);
  });

  onDestroy(() => {
    saveToStorage();
    window.removeEventListener('beforeunload', saveToStorageSync);
    _.remove(saveHandlersList, x => x == saveToStorageIfNeeded);
  });

  return {
    editorState,
    editorValue,
    setEditorData,
    clearEditorData,
    saveToStorage,
    saveToStorageSync,
    initialLoad,
  };
}

export async function saveAllPendingEditorData() {
  for (const item of saveHandlersList) {
    await item();
  }
}
