import _ from 'lodash';
import React from 'react';
import useStorage from './useStorage';
import { useConnectionInfo } from './metadataLoaders';
import usePrevious from './usePrevious';

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

const [CurrentDatabaseProvider, useCurrentDatabase, useSetCurrentDatabaseCore] = createGlobalState(null);

function useSetCurrentDatabase() {
  const setDb = useSetCurrentDatabaseCore();
  const db = useCurrentDatabase();
  return (value) => {
    if (_.get(db, 'name') !== _.get(value, 'name') || _.get(db, 'connection._id') != _.get(value, 'connection._id')) {
      setDb(value);
    }
  };
}

export { CurrentDatabaseProvider, useCurrentDatabase, useSetCurrentDatabase };

const [OpenedTabsProvider, useOpenedTabs, useSetOpenedTabs] = createStorageState('openedTabs', []);
export { OpenedTabsProvider, useOpenedTabs, useSetOpenedTabs };

export function useUpdateDatabaseForTab(tabVisible, conid, database) {
  const connection = useConnectionInfo({ conid });
  const setDb = useSetCurrentDatabase();
  const previousTabVisible = usePrevious(!!(tabVisible && connection));

  if (!conid || !database) return;

  if (!previousTabVisible && tabVisible && connection) {
    setDb({
      name: database,
      connection,
    });
  }
}

export function useAppObjectParams() {
  const setOpenedTabs = useSetOpenedTabs();
  const currentDatabase = useCurrentDatabase();
  return {
    setOpenedTabs,
    currentDatabase,
  };
}
