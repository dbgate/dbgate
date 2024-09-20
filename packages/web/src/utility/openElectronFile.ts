import { showModal } from '../modals/modalTools';
import { get } from 'svelte/store';
import newQuery from '../query/newQuery';
import getElectron from './getElectron';
import { currentDatabase, extensions, getCurrentDatabase } from '../stores';
import { getUploadListener } from './uploadFiles';
import { getConnectionLabel, getDatabaseFileLabel } from 'dbgate-tools';
import { apiCall } from './api';
import openNewTab from './openNewTab';
import { openJsonDocument } from '../tabs/JsonTab.svelte';
import { SAVED_FILE_HANDLERS } from '../appobj/SavedFileAppObject.svelte';
import _ from 'lodash';
import ErrorMessageModal from '../modals/ErrorMessageModal.svelte';
import { openImportExportTab } from './importExportTools';
import { switchCurrentDatabase } from './common';

export function canOpenByElectron(file, extensions) {
  if (!file) return false;
  const nameLower = file.toLowerCase();
  if (nameLower.endsWith('.sql')) return true;
  if (nameLower.endsWith('.diagram')) return true;
  if (nameLower.endsWith('.qdesign')) return true;
  if (nameLower.endsWith('.perspective')) return true;
  if (nameLower.endsWith('.json')) return true;
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
  switchCurrentDatabase({
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
  if (!e) e = 'utf8';

  return e;
}

function decodeFile(buf: Uint8Array, enc: string) {
  // TODO: use import instead of window.require. Requires doesn't work in built electron app
  const iconv = window.require('iconv-lite');
  return iconv.decode(buf, enc);
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

async function openSavedElectronFile(filePath, parsed, folder) {
  const handler = SAVED_FILE_HANDLERS[folder];
  const resp = await apiCall('files/load-from', { filePath, format: handler.format });

  const connProps: any = {};
  let tooltip = undefined;

  const db = getCurrentDatabase();
  if (handler.currentConnection) {
    const connection = db?.connection || {};
    const database = db?.name;
    connProps.conid = db?.connection?._id;
    connProps.database = database;
    tooltip = `${getConnectionLabel(connection)}\n${database}`;
  }

  openNewTab(
    {
      title: parsed.name,
      icon: handler.icon,
      tabComponent: handler.tabComponent,
      tooltip,
      props: {
        savedFile: null,
        savedFolder: null,
        savedFilePath: filePath,
        savedFormat: handler.format,
        ...connProps,
      },
    },
    { editor: resp }
  );
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
    // const buf = fs.readFileSync(filePath);
    // const data = decodeFile(buf, encoding);

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
  if (nameLower.endsWith('.json')) {
    fs.readFile(filePath, { encoding: 'utf-8' }, (err, data) => {
      if (err) {
        showModal(ErrorMessageModal, { message: err?.message || 'File cannot be loaded' });
      } else {
        try {
          const json = JSON.parse(data);
          openJsonDocument(json);
        } catch (err) {
          showModal(ErrorMessageModal, { message: err.message });
        }
      }
    });
    return;
  }
  if (nameLower.endsWith('.diagram')) {
    openSavedElectronFile(filePath, parsed, 'diagrams');
    return;
  }
  if (nameLower.endsWith('.qdesign')) {
    openSavedElectronFile(filePath, parsed, 'query');
    return;
  }
  if (nameLower.endsWith('.perspective')) {
    openSavedElectronFile(filePath, parsed, 'perspectives');
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
        openImportExportTab(
          {
            sourceStorageType: format.storageType,
          },
          {
            openedFile: {
              filePath,
              storageType: format.storageType,
              shortName: parsed.name,
            },
          }
        );

        // showModal(ImportExportModal, {
        //   openedFile: {
        //     filePath,
        //     storageType: format.storageType,
        //     shortName: parsed.name,
        //   },
        //   importToCurrentTarget: true,
        //   initialValues: {
        //     sourceStorageType: format.storageType,
        //   },
        // });
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
      {
        name: `All supported files`,
        extensions: [
          'sql',
          'sqlite',
          'db',
          'sqlite3',
          'diagram',
          'qdesign',
          'perspective',
          'json',
          ...getFileFormatExtensions(ext),
        ],
      },
      { name: `SQL files`, extensions: ['sql'] },
      { name: `JSON files`, extensions: ['json'] },
      { name: `Diagram files`, extensions: ['diagram'] },
      { name: `Query designer files`, extensions: ['qdesign'] },
      { name: `Perspective files`, extensions: ['perspective'] },
      { name: `SQLite database`, extensions: ['sqlite', 'db', 'sqlite3'] },
      ...getFileFormatFilters(ext),
    ],
    properties: ['showHiddenFiles', 'openFile'],
  });
  const filePath = filePaths && filePaths[0];
  if (canOpenByElectron(filePath, ext)) {
    openElectronFileCore(filePath, ext);
  }
}
