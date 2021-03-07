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

export default function useEditorData({ tabid, reloadToken = 0, loadFromArgs = null }) {
  const localStorageKey = `tabdata_editor_${tabid}`;
  let changeCounter = 0;
  let savedCounter = 0;

  const editorState = writable({
    errorMessage: null,
    isLoading: true,
    value: null,
  });

  const editorValue = derived(editorState, $state => $state.value);

  let initialData = null;
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
        value = init;
        initialData = init;
        // mark as not saved
        changeCounter += 1;
      } catch (err) {
        const message = (err && err.response && err.response.data && err.response.data.error) || 'Loading failed';
        editorState.update(x => ({
          ...x,
          errorMessage: message,
        }));
        console.error(err.response);
      }
    } else {
      const initFallback = getParsedLocalStorage(localStorageKey);
      if (initFallback != null) {
        editorState.update(x => ({
          ...x,
          value: initFallback,
        }));
        value = initFallback;
        // move to local forage
        await localforage.setItem(localStorageKey, initFallback);
        localStorage.removeItem(localStorageKey);
        initialData = initFallback;
      } else {
        const init = await localforage.getItem(localStorageKey);
        if (init) {
          editorState.update(x => ({
            ...x,
            value: init,
          }));
          value = init;
          initialData = init;
        }
      }
    }
    editorState.update(x => ({
      ...x,
      isLoading: false,
    }));
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

  onMount(() => {
    window.addEventListener('beforeunload', saveToStorageSync);
    initialLoad();
  });

  onDestroy(() => {
    saveToStorage();
    window.removeEventListener('beforeunload', saveToStorageSync);
  });

  return {
    editorState,
    editorValue,
    setEditorData,
    initialData,
    saveToStorage,
    saveToStorageSync,
    initialLoad,
  };
}
