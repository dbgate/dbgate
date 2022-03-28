import { showModal } from '../modals/modalTools';
import { get } from 'svelte/store';
import newQuery from '../query/newQuery';
import ImportExportModal from '../modals/ImportExportModal.svelte';
import getElectron from './getElectron';
import { currentDatabase, extensions } from '../stores';
import { getUploadListener } from './uploadFiles';
import { getDatabaseFileLabel } from './getConnectionLabel';
import { apiCall } from './api';
import openNewTab from './openNewTab';
import _ from 'lodash';

export function canOpenByElectron(file, extensions) {
  if (!file) return false;
  const nameLower = file.toLowerCase();
  if (nameLower.endsWith('.sql')) return true;
  if (nameLower.endsWith('.db') || nameLower.endsWith('.sqlite') || nameLower.endsWith('.sqlite3')) return true;
  for (const format of extensions.fileFormats) {
    if (nameLower.endsWith(`.${format.extension}`)) return true;
    if (format.extensions?.find(ext => nameLower.endsWith(`.${ext}`))) return true;
  }
  return false;
}

export async function openSqliteFile(filePath) {
  const defaultDatabase = getDatabaseFileLabel(filePath);
  const resp = await apiCall('connections/save', {
    _id: undefined,
    databaseFile: filePath,
    engine: 'sqlite@dbgate-plugin-sqlite',
    singleDatabase: true,
    defaultDatabase,
  });
  currentDatabase.set({
    connection: resp,
    name: getDatabaseFileLabel(filePath),
  });
}

function getFileEncoding(filePath, fs) {
  var buf = Buffer.alloc(5);
  var fd = fs.openSync(filePath, 'r');
  fs.readSync(fd, buf, 0, 5, 0);
  fs.closeSync(fd);

  // https://en.wikipedia.org/wiki/Byte_order_mark
  let e = null;
  if (!e && buf[0] === 0xef && buf[1] === 0xbb && buf[2] === 0xbf) e = 'utf8';
  if (!e && buf[0] === 0xfe && buf[1] === 0xff) e = 'utf16be';
  if (!e && buf[0] === 0xff && buf[1] === 0xfe) e = 'utf16le';
  if (!e) e = 'ascii';

  return e;
}

function openElectronJsonLinesFile(filePath, parsed) {
  openNewTab({
    title: parsed.name,
    tooltip: filePath,
    icon: 'img archive',
    tabComponent: 'ArchiveFileTab',
    props: {
      jslid: `file://${filePath}`,
    },
  });
}

export function openElectronFileCore(filePath, extensions) {
  const nameLower = filePath.toLowerCase();
  const path = window.require('path');
  const fs = window.require('fs');
  const parsed = path.parse(filePath);
  const uploadListener = getUploadListener();

  if (nameLower.endsWith('.sql')) {
    const encoding = getFileEncoding(filePath, fs);
    const data = fs.readFileSync(filePath, { encoding });

    newQuery({
      title: parsed.name,
      initialData: data,
      // @ts-ignore
      savedFilePath: filePath,
      savedFormat: 'text',
    });
    return;
  }
  if (nameLower.endsWith('.db') || nameLower.endsWith('.sqlite') || nameLower.endsWith('.sqlite')) {
    openSqliteFile(filePath);
    return;
  }
  if (nameLower.endsWith('.jsonl') || nameLower.endsWith('.ndjson')) {
    openElectronJsonLinesFile(filePath, parsed);
    return;
  }
  for (const format of extensions.fileFormats) {
    if (nameLower.endsWith(`.${format.extension}`)) {
      if (uploadListener) {
        uploadListener({
          filePath,
          storageType: format.storageType,
          shortName: parsed.name,
        });
      } else {
        showModal(ImportExportModal, {
          openedFile: {
            filePath,
            storageType: format.storageType,
            shortName: parsed.name,
          },
          importToCurrentTarget: true,
          initialValues: {
            sourceStorageType: format.storageType,
          },
        });
      }
    }
  }
}

function getFileFormatFilters(extensions) {
  return extensions.fileFormats
    .filter(x => x.readerFunc)
    .map(x => ({ name: x.name, extensions: x.extensions || [x.extension] }));
}

function getFileFormatExtensions(extensions) {
  return _.flatten(extensions.fileFormats.filter(x => x.readerFunc).map(x => x.extensions || [x.extension]));
}

export async function openElectronFile() {
  const electron = getElectron();
  const ext = get(extensions);

  const filePaths = await electron.showOpenDialog({
    filters: [
      { name: `All supported files`, extensions: ['sql', 'sqlite', 'db', 'sqlite3', ...getFileFormatExtensions(ext)] },
      { name: `SQL files`, extensions: ['sql'] },
      { name: `SQLite database`, extensions: ['sqlite', 'db', 'sqlite3'] },
      ...getFileFormatFilters(ext),
    ],
  });
  const filePath = filePaths && filePaths[0];
  if (canOpenByElectron(filePath, ext)) {
    openElectronFileCore(filePath, ext);
  }
}
