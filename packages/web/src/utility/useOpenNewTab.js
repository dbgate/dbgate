import uuidv1 from 'uuid/v1';
import React from 'react';
import localforage from 'localforage';
import { useSetOpenedTabs } from './globalState';

export default function useOpenNewTab() {
  const setOpenedTabs = useSetOpenedTabs();

  const openNewTab = React.useCallback(
    async (newTab, initialData = undefined) => {
      const tabid = uuidv1();
      if (initialData) {
        await localforage.setItem(`tabdata_${tabid}`, initialData);
      }
      setOpenedTabs((files) => [
        ...(files || []).map((x) => ({ ...x, selected: false })),
        {
          tabid,
          selected: true,
          ...newTab,
        },
      ]);
    },
    [setOpenedTabs]
  );

  return openNewTab;
}
