import _ from 'lodash';
import uuidv1 from 'uuid/v1';
import { getActiveTab, getOpenedTabs, openedTabs } from '../stores';
import tabs from '../tabs';
import { setSelectedTabFunc, switchCurrentDatabase } from './common';
import localforage from 'localforage';
import stableStringify from 'json-stable-stringify';
import { saveAllPendingEditorData } from '../query/useEditorData';
import { getConnectionInfo } from './metadataLoaders';
import { getBoolSettingsValue } from '../settings/settingsTools';

function findFreeNumber(numbers: number[]) {
  if (numbers.length == 0) return 1;
  return _.max(numbers) + 1;
  // let res = 1;
  // while (numbers.includes(res)) res += 1;
  // return res;
}

export default async function openNewTab(newTab, initialData: any = undefined, options: any = undefined) {
  const oldTabs = getOpenedTabs();
  const activeTab = getActiveTab();

  let existing = null;

  if (!getBoolSettingsValue('behaviour.useTabPreviewMode', true) && newTab.tabPreviewMode) {
    newTab = {
      ...newTab,
      tabPreviewMode: false,
    };
  }

  const { savedFile, savedFolder, savedFilePath, conid, database } = newTab.props || {};

  if (conid && database) {
    const connection = await getConnectionInfo({ conid });
    await switchCurrentDatabase({
      connection,
      name: database,
    });
  }

  const { tabPreviewMode } = newTab;
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
    openedTabs.update(tabs =>
      setSelectedTabFunc(tabs, existing.tabid, !tabPreviewMode ? { tabPreviewMode: false } : {})
    );
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
      if (key == 'editor' || key == 'rows') {
        await localforage.setItem(`tabdata_${key}_${tabid}`, initialData[key]);
      } else {
        localStorage.setItem(`tabdata_${key}_${tabid}`, JSON.stringify(initialData[key]));
      }
    }
  }

  openedTabs.update(files => {
    const dbKey = getTabDbKey(newTab);
    const items = sortTabs(files.filter(x => x.closedTime == null));

    const newItem = {
      ...newTab,
      tabid,
    };
    if (dbKey != null) {
      const lastIndex = _.findLastIndex(items, x => getTabDbKey(x) == dbKey);
      if (lastIndex >= 0) {
        items.splice(lastIndex + 1, 0, newItem);
      } else {
        items.push(newItem);
      }
    } else {
      items.push(newItem);
    }

    const filesFiltered = tabPreviewMode ? (files || []).filter(x => !x.tabPreviewMode) : files;

    return [
      ...(filesFiltered || []).map(x => ({
        ...x,
        selected: false,
        tabOrder: _.findIndex(items, y => y.tabid == x.tabid),
      })),
      {
        ...newTab,
        tabid,
        selected: true,
        multiTabIndex: newTab?.multiTabIndex ?? activeTab?.multiTabIndex ?? 0,
        tabOrder: _.findIndex(items, y => y.tabid == tabid),
      },
    ];
  });

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

export function getTabDbKey(tab) {
  if (tab.tabComponent == 'ConnectionTab') {
    return 'connections.';
  }
  if (tab.tabComponent?.startsWith('Admin')) {
    return 'admin.';
  }
  if (tab.props && tab.props.conid && tab.props.database) {
    return `database://${tab.props.database}-${tab.props.conid}`;
  }
  if (tab.props && tab.props.conid) {
    return `server://${tab.props.conid}`;
  }
  if (tab.props && tab.props.archiveFolder) {
    return `archive://${tab.props.archiveFolder}`;
  }
  return null;
}

export function sortTabs(tabs: any[]): any[] {
  return _.sortBy(tabs, [x => x.tabOrder || 0, x => getTabDbKey(x), 'title', 'tabid']);
}

export function groupTabs(tabs: any[]) {
  const res = [];

  for (const tab of sortTabs(tabs)) {
    const lastGroup = res[res.length - 1];
    if (lastGroup && tab.tabDbKey && lastGroup.tabDbKey == tab.tabDbKey) {
      lastGroup.tabs.push(tab);
    } else {
      res.push({
        tabDbKey: tab.tabDbKey,
        tabDbName: tab.tabDbName,
        tabDbServer: tab.tabDbServer,
        tabs: [tab],
        grpid: tab.tabid,
      });
    }
  }

  return res;
}
