import uuidv1 from 'uuid/v1';
import React from 'react';
import localforage from 'localforage';
import stableStringify from 'json-stable-stringify';
import _ from 'lodash';
import { useOpenedTabs, useSetOpenedTabs } from './globalState';
import tabs from '../tabs';

export default function useOpenNewTab() {
  const setOpenedTabs = useSetOpenedTabs();
  const openedTabs = useOpenedTabs();

  const openNewTab = React.useCallback(
    async (newTab, initialData = undefined) => {
      let existing = null;

      const { savedFile } = newTab.props || {};
      if (savedFile) {
        existing = openedTabs.find(
          (x) =>
            x.props && x.tabComponent == newTab.tabComponent && x.closedTime == null && x.props.savedFile == savedFile
        );
      }

      const component = tabs[newTab.tabComponent];
      if (!existing && component && component.matchingProps) {
        const testString = stableStringify(_.pick(newTab.props || {}, component.matchingProps));
        existing = openedTabs.find(
          (x) =>
            x.props &&
            x.tabComponent == newTab.tabComponent &&
            x.closedTime == null &&
            stableStringify(_.pick(x.props || {}, component.matchingProps)) == testString
        );
      }

      if (existing) {
        setOpenedTabs((tabs) =>
          tabs.map((x) => ({
            ...x,
            selected: x.tabid == existing.tabid,
          }))
        );
        return;
      }

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
