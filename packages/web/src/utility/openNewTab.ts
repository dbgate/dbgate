import _ from 'lodash';
import uuidv1 from 'uuid/v1';
import { get } from 'svelte/store';
import { openedTabs } from '../stores';
import tabs from '../tabs';
import { setSelectedTabFunc } from './common';
import localforage from 'localforage';
import stableStringify from 'json-stable-stringify';
import { saveAllPendingEditorData } from '../query/useEditorData';

function findFreeNumber(numbers: number[]) {
  if (numbers.length == 0) return 1;
  return _.max(numbers) + 1;
  // let res = 1;
  // while (numbers.includes(res)) res += 1;
  // return res;
}

export default async function openNewTab(newTab, initialData = undefined, options = undefined) {
  const oldTabs = get(openedTabs);

  let existing = null;

  const { savedFile, savedFolder, savedFilePath } = newTab.props || {};
  if (savedFile || savedFilePath) {
    existing = oldTabs.find(
      x =>
        x.props &&
        x.tabComponent == newTab.tabComponent &&
        x.closedTime == null &&
        x.props.savedFile == savedFile &&
        x.props.savedFolder == savedFolder &&
        x.props.savedFilePath == savedFilePath
    );
  }

  const { forceNewTab } = options || {};

  const component = tabs[newTab.tabComponent];
  if (!existing && !forceNewTab && component && component.matchingProps) {
    const testString = stableStringify(_.pick(newTab.props || {}, component.matchingProps));
    existing = oldTabs.find(
      x =>
        x.props &&
        x.tabComponent == newTab.tabComponent &&
        x.closedTime == null &&
        stableStringify(_.pick(x.props || {}, component.matchingProps)) == testString
    );
  }

  if (existing) {
    openedTabs.update(tabs => setSelectedTabFunc(tabs, existing.tabid));
    return;
  }

  // new tab will be created
  if (newTab.title.endsWith('#')) {
    const numbers = oldTabs
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
  openedTabs.update(files => [
    ...(files || []).map(x => ({ ...x, selected: false })),
    {
      ...newTab,
      tabid,
      selected: true,
    },
  ]);

  // console.log('OPENING NEW TAB', newTab);
  // const tabid = uuidv1();
  // openedTabs.update(tabs => [
  //   ...(tabs || []).map(x => ({ ...x, selected: false })),
  //   {
  //     tabid,
  //     selected: true,
  //     ...newTab,
  //   },
  // ]);
}

export async function duplicateTab(tab) {
  await saveAllPendingEditorData();

  let title = tab.title;
  const mtitle = title.match(/^(.*#)[\d]+$/);
  if (mtitle) title = mtitle[1];

  const keyRegex = /^tabdata_([^_]+)_([^_]+)$/;
  const initialData = {};
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    const m = key.match(keyRegex);
    if (m && m[2] == tab.tabid) {
      initialData[m[1]] = JSON.parse(localStorage.getItem(key));
    }
  }
  for (const key of await localforage.keys()) {
    const m = key.match(keyRegex);
    if (m && m[2] == tab.tabid) {
      initialData[m[1]] = await localforage.getItem(key);
    }
  }
  openNewTab(
    {
      ..._.omit(tab, ['tabid']),
      title,
    },
    initialData,
    { forceNewTab: true }
  );
}
