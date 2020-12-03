import React from 'react';
import _ from 'lodash';
import localforage from 'localforage';

export default function useEditorData(tabid, initialData = null) {
  const localStorageKey = `tabdata_${tabid}`;

  const [value, setValue] = React.useState(initialData);
  const [isLoading, setIsLoading] = React.useState(true);

  const valueRef = React.useRef(null);

  const initialLoad = async () => {
    const init = await localforage.getItem(localStorageKey);
    if (init) {
      setValue(init);
      valueRef.current = init;
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
    } catch (err) {
      console.error(err);
    }
  }, [localStorageKey, valueRef]);

  const saveToStorageDebounced = React.useMemo(() => _.debounce(saveToStorage, 500), [saveToStorage]);

  const handleChange = (newValue) => {
    if (newValue != null) valueRef.current = newValue;
    setValue(newValue);
    saveToStorageDebounced();
  };

  React.useEffect(() => {
    window.addEventListener('beforeunload', saveToStorage);
    return () => {
      saveToStorage();
      window.removeEventListener('beforeunload', saveToStorage);
    };
  }, []);

  return { editorData: value, setEditorData: handleChange, isLoading };
}
