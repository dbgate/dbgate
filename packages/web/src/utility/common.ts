import { findDefaultSchema, findEngineDriver, isCompositeDbName } from 'dbgate-tools';
import { currentDatabase, getExtensions, getOpenedTabs, loadingSchemaLists, openedTabs } from '../stores';
import _ from 'lodash';
import { getSchemaList } from './metadataLoaders';
import { showSnackbarError } from './snackbar';

export class LoadingToken {
  isCanceled = false;

  cancel() {
    this.isCanceled = true;
  }
}

export function sleep(milliseconds) {
  return new Promise(resolve => window.setTimeout(() => resolve(null), milliseconds));
}

export function changeTab(tabid, changeFunc) {
  openedTabs.update(files => files.map(tab => (tab.tabid == tabid ? changeFunc(tab) : tab)));
}

export function markTabUnsaved(tabid) {
  const tab = getOpenedTabs().find(x => x.tabid == tabid);
  if (tab.unsaved) return;
  openedTabs.update(files =>
    files.map(tab => (tab.tabid == tabid ? { ...tab, unsaved: true, tabPreviewMode: false } : tab))
  );
}

export function markTabSaved(tabid) {
  openedTabs.update(files => files.map(tab => (tab.tabid == tabid ? { ...tab, unsaved: false } : tab)));
}

export function setSelectedTabFunc(files, tabid, additionalProps = {}) {
  return [
    ...(files || [])
      .filter(x => x.tabid != tabid)
      .map(x => ({
        ...x,
        selected: false,
        focused: false,
      })),
    ...(files || [])
      .filter(x => x.tabid == tabid)
      .map(x => ({
        ...x,
        selected: true,
        focused: false,
        ...additionalProps,
      })),
  ];
}

export function setSelectedTab(tabid) {
  openedTabs.update(tabs => setSelectedTabFunc(tabs, tabid));
}

export function getObjectTypeFieldLabel(objectTypeField, driver?) {
  if (objectTypeField == 'matviews') return 'Materialized Views';
  if (objectTypeField == 'collections') return _.startCase(driver?.collectionPluralLabel) ?? 'Collections/Containers';
  return _.startCase(objectTypeField);
}

export async function asyncFilter(arr, predicate) {
  const results = await Promise.all(arr.map(predicate));

  return arr.filter((_v, index) => results[index]);
}

export function isMac() {
  // @ts-ignore
  const platform = navigator?.platform || navigator?.userAgentData?.platform || 'unknown';
  return platform.toUpperCase().indexOf('MAC') >= 0;
}

export function formatKeyText(keyText: string): string {
  if (isMac()) {
    return keyText
      .replace(/CtrlOrCommand\+/g, '⌘ ')
      .replace(/Shift\+/g, '⇧ ')
      .replace(/Alt\+/g, '⌥ ')
      .replace(/Command\+/g, '⌘ ')
      .replace(/Ctrl\+/g, '⌃ ')
      .replace(/Backspace/g, '⌫ ');
  }
  return keyText.replace(/CtrlOrCommand\+/g, 'Ctrl+');
}

export function resolveKeyText(keyText: string): string {
  if (isMac()) {
    return keyText.replace(/CtrlOrCommand\+/g, 'Command+');
  }
  return keyText.replace(/CtrlOrCommand\+/g, 'Ctrl+');
}

export function isCtrlOrCommandKey(event) {
  if (isMac()) {
    return event.metaKey;
  }
  return event.ctrlKey;
}

export async function loadSchemaList(conid, database) {
  try {
    loadingSchemaLists.update(x => ({ ...x, [`${conid}::${database}`]: true }));
    const schemas = await getSchemaList({ conid, database });
    if (schemas.errorMessage) {
      showSnackbarError(`Error loading schemas: ${schemas.errorMessage}`);
      console.error('Error loading schemas', schemas.errorMessage);
      return;
    }
    return schemas;
  } finally {
    loadingSchemaLists.update(x => _.omit(x, [`${conid}::${database}`]));
  }
}

export async function switchCurrentDatabase(data) {
  if (data?.connection?.useSeparateSchemas && !isCompositeDbName(data.name)) {
    const conid = data.connection._id;
    const database = data.name;
    const storageKey = `selected-schema-${conid}-${database}`;
    const schemaInStorage = localStorage.getItem(storageKey);
    const schemas = await loadSchemaList(conid, database);
    if (!schemas) return;
    const driver = findEngineDriver(data.connection, getExtensions());
    const defaultSchema = findDefaultSchema(schemas, driver?.dialect, schemaInStorage);
    currentDatabase.set({
      ...data,
      name: `${data.name}::${defaultSchema}`,
    });
  } else {
    currentDatabase.set(data);
  }
}
