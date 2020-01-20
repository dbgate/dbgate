import React from 'react';
import useStorage from './useStorage';

function createGlobalState(defaultValue) {
  const Context = React.createContext(null);

  function Provider({ children }) {
    const [currentvalue, setCurrentValue] = React.useState(defaultValue);
    return <Context.Provider value={[currentvalue, setCurrentValue]}>{children}</Context.Provider>;
  }

  function useValue() {
    return React.useContext(Context)[0];
  }

  function useSetValue() {
    return React.useContext(Context)[1];
  }

  return [Provider, useValue, useSetValue];
}

function createStorageState(storageKey, defaultValue) {
  const Context = React.createContext(null);

  function Provider({ children }) {
    const [currentvalue, setCurrentValue] = useStorage(storageKey, localStorage, defaultValue);
    return <Context.Provider value={[currentvalue, setCurrentValue]}>{children}</Context.Provider>;
  }

  function useValue() {
    return React.useContext(Context)[0];
  }

  function useSetValue() {
    return React.useContext(Context)[1];
  }

  return [Provider, useValue, useSetValue];
}

const [CurrentWidgetProvider, useCurrentWidget, useSetCurrentWidget] = createGlobalState('database');
export { CurrentWidgetProvider, useCurrentWidget, useSetCurrentWidget };

const [CurrentDatabaseProvider, useCurrentDatabase, useSetCurrentDatabase] = createGlobalState(null);
export { CurrentDatabaseProvider, useCurrentDatabase, useSetCurrentDatabase };

const [OpenedFilesProvider, useOpenedFiles, useSetOpenedFiles] = createStorageState('openedFiles', []);
export { OpenedFilesProvider, useOpenedFiles, useSetOpenedFiles };
