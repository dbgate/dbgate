import React from 'react';
import _ from 'lodash';
import localforage from 'localforage';
import { changeTab } from './common';
import { useSetOpenedTabs } from './globalState';

export default function useEditorData({ tabid, loadFromArgs = null }) {
  const localStorageKey = `tabdata_${tabid}`;
  const setOpenedTabs = useSetOpenedTabs();
  const changeCounterRef = React.useRef(0);
  const savedCounterRef = React.useRef(0);
  const [errorMessage, setErrorMessage] = React.useState(null);

  const [value, setValue] = React.useState(null);
  const [isLoading, setIsLoading] = React.useState(true);
  const initialDataRef = React.useRef(null);

  const valueRef = React.useRef(null);

  const initialLoad = async () => {
    if (loadFromArgs) {
      try {
        const init = await loadFromArgs();
        changeTab(tabid, setOpenedTabs, (tab) => ({
          ...tab,
          props: _.omit(tab.props, ['initialArgs']),
        }));
        setValue(init);
        valueRef.current = init;
        initialDataRef.current = init;
      } catch (err) {
        const message = (err && err.response && err.response.data && err.response.data.error) || 'Loading failed';
        setErrorMessage(message);
        console.error(err.response);
      }
    } else {
      const initFallback = localStorage.getItem(localStorageKey);
      if (initFallback != null) {
        const init = JSON.parse(initFallback);
        setValue(init);
        valueRef.current = init;
        // move to local forage
        await localforage.setItem(localStorageKey, init);
        localStorage.removeItem(localStorageKey);
        initialDataRef.current = init;
      } else {
        const init = await localforage.getItem(localStorageKey);
        if (init) {
          setValue(init);
          valueRef.current = init;
          initialDataRef.current = init;
        }
      }
    }
    setIsLoading(false);
  };

  React.useEffect(() => {
    initialLoad();
  }, []);

  const saveToStorage = React.useCallback(async () => {
    if (valueRef.current == null) return;
    try {
      await localforage.setItem(localStorageKey, valueRef.current);
      savedCounterRef.current = changeCounterRef.current;
    } catch (err) {
      console.error(err);
    }
  }, [localStorageKey, valueRef]);

  const saveToStorageFallback = React.useCallback(() => {
    if (valueRef.current == null) return;
    if (savedCounterRef.current == changeCounterRef.current) return; // all saved
    // on window unload must be synchronous actions, save to local storage instead
    localStorage.setItem(localStorageKey, JSON.stringify(valueRef.current));
  }, [localStorageKey, valueRef]);

  const saveToStorageDebounced = React.useMemo(() => _.debounce(saveToStorage, 5000), [saveToStorage]);

  const handleChange = (newValue) => {
    if (newValue != null) valueRef.current = newValue;
    setValue(newValue);
    changeCounterRef.current += 1;
    saveToStorageDebounced();
  };

  React.useEffect(() => {
    window.addEventListener('beforeunload', saveToStorageFallback);
    return () => {
      saveToStorage();
      window.removeEventListener('beforeunload', saveToStorageFallback);
    };
  }, []);

  return {
    editorData: value,
    setEditorData: handleChange,
    isLoading,
    initialData: initialDataRef.current,
    errorMessage,
  };
}
