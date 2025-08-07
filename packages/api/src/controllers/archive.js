const fs = require('fs-extra');
const readline = require('readline');
const crypto = require('crypto');
const path = require('path');
const { archivedir, clearArchiveLinksCache, resolveArchiveFolder, uploadsdir } = require('../utility/directories');
const socket = require('../utility/socket');
const loadFilesRecursive = require('../utility/loadFilesRecursive');
const getJslFileName = require('../utility/getJslFileName');
const { getLogger, extractErrorLogData, jsonLinesParse } = require('dbgate-tools');
const dbgateApi = require('../shell');
const jsldata = require('./jsldata');
const platformInfo = require('../utility/platformInfo');
const { isProApp } = require('../utility/checkLicense');
const listZipEntries = require('../utility/listZipEntries');
const unzipJsonLinesFile = require('../shell/unzipJsonLinesFile');
const { zip } = require('lodash');
const zipDirectory = require('../shell/zipDirectory');
const unzipDirectory = require('../shell/unzipDirectory');

const logger = getLogger('archive');

module.exports = {
  folders_meta: true,
  async folders() {
    const folders = await fs.readdir(archivedir());
    return [
      {
        name: 'default',
        type: 'jsonl',
      },
      ...folders
        .filter(x => x != 'default')
        .map(name => ({
          name,
          type: 'jsonl',
        })),
    ];
  },

  createFolder_meta: true,
  async createFolder({ folder }) {
    await fs.mkdir(path.join(archivedir(), folder));
    socket.emitChanged('archive-folders-changed');
    return true;
  },

  createLink_meta: true,
  async createLink({ linkedFolder }) {
    const folder = await this.getNewArchiveFolder({ database: path.parse(linkedFolder).name + '.link' });
    fs.writeFile(path.join(archivedir(), folder), linkedFolder);
    clearArchiveLinksCache();
    socket.emitChanged('archive-folders-changed');
    return folder;
  },

  async getZipFiles({ file }) {
    const entries = await listZipEntries(path.join(archivedir(), file));
    const files = entries.map(entry => {
      let name = entry.fileName;
      if (isProApp() && entry.fileName.endsWith('.jsonl')) {
        name = entry.fileName.slice(0, -6);
      }
      return {
        name: name,
        label: name,
        type: isProApp() && entry.fileName.endsWith('.jsonl') ? 'jsonl' : 'other',
      };
    });
    return files;
  },

  files_meta: true,
  async files({ folder }) {
    try {
      if (folder.endsWith('.zip')) {
        if (await fs.exists(path.join(archivedir(), folder))) {
          return this.getZipFiles({ file: folder });
        }
        return [];
      }
      const dir = resolveArchiveFolder(folder);
      if (!(await fs.exists(dir))) return [];
      const files = await loadFilesRecursive(dir); // fs.readdir(dir);

      function fileType(ext, type) {
        return files
          .filter(name => name.endsWith(ext))
          .map(name => ({
            name: name.slice(0, -ext.length),
            label: path.parse(name.slice(0, -ext.length)).base,
            type,
          }));
      }

      return [
        ...fileType('.jsonl', 'jsonl'),
        ...fileType('.table.yaml', 'table.yaml'),
        ...fileType('.view.sql', 'view.sql'),
        ...fileType('.proc.sql', 'proc.sql'),
        ...fileType('.func.sql', 'func.sql'),
        ...fileType('.trigger.sql', 'trigger.sql'),
        ...fileType('.matview.sql', 'matview.sql'),
      ];
    } catch (err) {
      logger.error(extractErrorLogData(err), 'DBGM-00001 Error reading archive files');
      return [];
    }
  },

  refreshFiles_meta: true,
  async refreshFiles({ folder }) {
    socket.emitChanged('archive-files-changed', { folder });
    return true;
  },

  refreshFolders_meta: true,
  async refreshFolders() {
    socket.emitChanged(`archive-folders-changed`);
    return true;
  },

  createFile_meta: true,
  async createFile({ folder, file, fileType, tableInfo }) {
    await fs.writeFile(
      path.join(resolveArchiveFolder(folder), `${file}.${fileType}`),
      tableInfo ? JSON.stringify({ __isStreamHeader: true, tableInfo }) : ''
    );
    socket.emitChanged(`archive-files-changed`, { folder });
    return true;
  },

  deleteFile_meta: true,
  async deleteFile({ folder, file, fileType }) {
    await fs.unlink(path.join(resolveArchiveFolder(folder), `${file}.${fileType}`));
    socket.emitChanged(`archive-files-changed`, { folder });
    return true;
  },

  renameFile_meta: true,
  async renameFile({ folder, file, newFile, fileType }) {
    await fs.rename(
      path.join(resolveArchiveFolder(folder), `${file}.${fileType}`),
      path.join(resolveArchiveFolder(folder), `${newFile}.${fileType}`)
    );
    socket.emitChanged(`archive-files-changed`, { folder });
    return true;
  },

  modifyFile_meta: true,
  async modifyFile({ folder, file, changeSet, mergedRows, mergeKey, mergeMode }) {
    await jsldata.closeDataStore(`archive://${folder}/${file}`);
    const changedFilePath = path.join(resolveArchiveFolder(folder), `${file}.jsonl`);

    if (!fs.existsSync(changedFilePath)) {
      if (!mergedRows) {
        return false;
      }
      const fileStream = fs.createWriteStream(changedFilePath);
      for (const row of mergedRows) {
        await fileStream.write(JSON.stringify(row) + '\n');
      }
      await fileStream.close();

      socket.emitChanged(`archive-files-changed`, { folder });
      return true;
    }

    const tmpchangedFilePath = path.join(resolveArchiveFolder(folder), `${file}-${crypto.randomUUID()}.jsonl`);
    const reader = await dbgateApi.modifyJsonLinesReader({
      fileName: changedFilePath,
      changeSet,
      mergedRows,
      mergeKey,
      mergeMode,
    });
    const writer = await dbgateApi.jsonLinesWriter({ fileName: tmpchangedFilePath });
    await dbgateApi.copyStream(reader, writer);
    if (platformInfo.isWindows) {
      await fs.copyFile(tmpchangedFilePath, changedFilePath);
      await fs.unlink(tmpchangedFilePath);
    } else {
      await fs.unlink(changedFilePath);
      await fs.rename(tmpchangedFilePath, changedFilePath);
    }
    return true;
  },

  renameFolder_meta: true,
  async renameFolder({ folder, newFolder }) {
    const uniqueName = await this.getNewArchiveFolder({ database: newFolder });
    await fs.rename(path.join(archivedir(), folder), path.join(archivedir(), uniqueName));
    socket.emitChanged(`archive-folders-changed`);
    return true;
  },

  deleteFolder_meta: true,
  async deleteFolder({ folder }) {
    if (!folder) throw new Error('Missing folder parameter');
    if (folder.endsWith('.link') || folder.endsWith('.zip')) {
      await fs.unlink(path.join(archivedir(), folder));
    } else {
      await fs.rmdir(path.join(archivedir(), folder), { recursive: true });
    }
    socket.emitChanged(`archive-folders-changed`);
    return true;
  },

  saveText_meta: true,
  async saveText({ folder, file, text }) {
    await fs.writeFile(path.join(resolveArchiveFolder(folder), `${file}.jsonl`), text);
    socket.emitChanged(`archive-files-changed`, { folder });
    return true;
  },

  saveJslData_meta: true,
  async saveJslData({ folder, file, jslid, changeSet }) {
    const source = getJslFileName(jslid);
    const target = path.join(resolveArchiveFolder(folder), `${file}.jsonl`);
    if (changeSet) {
      const reader = await dbgateApi.modifyJsonLinesReader({
        fileName: source,
        changeSet,
      });
      const writer = await dbgateApi.jsonLinesWriter({ fileName: target });
      await dbgateApi.copyStream(reader, writer);
    } else {
      await fs.copyFile(source, target);
      socket.emitChanged(`archive-files-changed`, { folder });
    }
    return true;
  },

  saveRows_meta: true,
  async saveRows({ folder, file, rows }) {
    const fileStream = fs.createWriteStream(path.join(resolveArchiveFolder(folder), `${file}.jsonl`));
    for (const row of rows) {
      await fileStream.write(JSON.stringify(row) + '\n');
    }
    await fileStream.close();
    socket.emitChanged(`archive-files-changed`, { folder });
    return true;
  },

  async getNewArchiveFolder({ database }) {
    const isLink = database.endsWith('.link');
    const isZip = database.endsWith('.zip');
    const name = isLink ? database.slice(0, -5) : isZip ? database.slice(0, -4) : database;
    const suffix = isLink ? '.link' : isZip ? '.zip' : '';
    if (!(await fs.exists(path.join(archivedir(), database)))) return database;
    let index = 2;
    while (await fs.exists(path.join(archivedir(), `${name}${index}${suffix}`))) {
      index += 1;
    }
    return `${name}${index}${suffix}`;
  },

  getArchiveData_meta: true,
  async getArchiveData({ folder, file }) {
    let rows;
    if (folder.endsWith('.zip')) {
      rows = await unzipJsonLinesFile(path.join(archivedir(), folder), `${file}.jsonl`);
    } else {
      rows = jsonLinesParse(await fs.readFile(path.join(archivedir(), folder, `${file}.jsonl`), { encoding: 'utf8' }));
    }
    return rows.filter(x => !x.__isStreamHeader);
  },

  saveUploadedZip_meta: true,
  async saveUploadedZip({ filePath, fileName }) {
    if (!fileName?.endsWith('.zip')) {
      throw new Error(`${fileName} is not a ZIP file`);
    }

    const folder = await this.getNewArchiveFolder({ database: fileName });
    await fs.copyFile(filePath, path.join(archivedir(), folder));
    socket.emitChanged(`archive-folders-changed`);

    return null;
  },

  zip_meta: true,
  async zip({ folder }) {
    const newFolder = await this.getNewArchiveFolder({ database: folder + '.zip' });
    await zipDirectory(path.join(archivedir(), folder), path.join(archivedir(), newFolder));
    socket.emitChanged(`archive-folders-changed`);

    return null;
  },

  unzip_meta: true,
  async unzip({ folder }) {
    const newFolder = await this.getNewArchiveFolder({ database: folder.slice(0, -4) });
    await unzipDirectory(path.join(archivedir(), folder), path.join(archivedir(), newFolder));
    socket.emitChanged(`archive-folders-changed`);

    return null;
  },

  getZippedPath_meta: true,
  async getZippedPath({ folder }) {
    if (folder.endsWith('.zip')) {
      return { filePath: path.join(archivedir(), folder) };
    }

    const uploadName = crypto.randomUUID();
    const filePath = path.join(uploadsdir(), uploadName);
    await zipDirectory(path.join(archivedir(), folder), filePath);
    return { filePath };
  },
};
