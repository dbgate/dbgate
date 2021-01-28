import uuidv1 from 'uuid/v1';
import React from 'react';
import localforage from 'localforage';
import stableStringify from 'json-stable-stringify';
import _ from 'lodash';
import { useOpenedTabs, useSetOpenedTabs } from './globalState';
import tabs from '../tabs';
import { setSelectedTabFunc } from './common';

function findFreeNumber(numbers) {
  if (numbers.length == 0) return 1;
  return _.max(numbers) + 1;
  // let res = 1;
  // while (numbers.includes(res)) res += 1;
  // return res;
}

export default function useOpenNewTab() {
  const setOpenedTabs = useSetOpenedTabs();
  const openedTabs = useOpenedTabs();

  const openNewTab = React.useCallback(
    async (newTab, initialData = undefined, options) => {
      let existing = null;

      const { savedFile } = newTab.props || {};
      if (savedFile) {
        existing = openedTabs.find(
          x =>
            x.props && x.tabComponent == newTab.tabComponent && x.closedTime == null && x.props.savedFile == savedFile
        );
      }

      const { forceNewTab } = options || {};

      const component = tabs[newTab.tabComponent];
      if (!existing && !forceNewTab && component && component.matchingProps) {
        const testString = stableStringify(_.pick(newTab.props || {}, component.matchingProps));
        existing = openedTabs.find(
          x =>
            x.props &&
            x.tabComponent == newTab.tabComponent &&
            x.closedTime == null &&
            stableStringify(_.pick(x.props || {}, component.matchingProps)) == testString
        );
      }

      if (existing) {
        setOpenedTabs(tabs => setSelectedTabFunc(tabs, existing.tabid));
        return;
      }

      // new tab will be created
      if (newTab.title.endsWith('#')) {
        const numbers = openedTabs
          .filter(x => x.closedTime == null && x.title && x.title.startsWith(newTab.title))
          .map(x => parseInt(x.title.substring(newTab.title.length)));

        newTab.title = `${newTab.title}${findFreeNumber(numbers)}`;
      }

      const tabid = uuidv1();
      if (initialData) {
        for (const key of _.keys(initialData)) {
          if (key == 'editor') {
            await localforage.setItem(`tabdata_${key}_${tabid}`, initialData[key]);
          } else {
            localStorage.setItem(`tabdata_${key}_${tabid}`, JSON.stringify(initialData[key]));
          }
        }
      }
      setOpenedTabs(files => [
        ...(files || []).map(x => ({ ...x, selected: false })),
        {
          tabid,
          selected: true,
          ...newTab,
        },
      ]);
    },
    [setOpenedTabs, openedTabs]
  );

  return openNewTab;
}
