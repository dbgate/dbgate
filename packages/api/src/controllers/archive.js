const fs = require('fs-extra');
const stream = require('stream');
const readline = require('readline');
const path = require('path');
const { formatWithOptions } = require('util');
const { archivedir, clearArchiveLinksCache, resolveArchiveFolder } = require('../utility/directories');
const socket = require('../utility/socket');
const JsonLinesDatastore = require('../utility/JsonLinesDatastore');
const { saveFreeTableData } = require('../utility/freeTableStorage');

module.exports = {
  folders_meta: 'get',
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

  createFolder_meta: 'post',
  async createFolder({ folder }) {
    await fs.mkdir(path.join(archivedir(), folder));
    socket.emitChanged('archive-folders-changed');
    return true;
  },

  createLink_meta: 'post',
  async createLink({ linkedFolder }) {
    const folder = await this.getNewArchiveFolder({ database: path.parse(linkedFolder).name + '.link' });
    fs.writeFile(path.join(archivedir(), folder), linkedFolder);
    clearArchiveLinksCache();
    socket.emitChanged('archive-folders-changed');
    return true;
  },

  files_meta: 'get',
  async files({ folder }) {
    const dir = resolveArchiveFolder(folder);
    if (!(await fs.exists(dir))) return [];
    const files = await fs.readdir(dir);

    function fileType(ext, type) {
      return files
        .filter(name => name.endsWith(ext))
        .map(name => ({
          name: name.slice(0, -ext.length),
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
  },

  refreshFiles_meta: 'post',
  async refreshFiles({ folder }) {
    socket.emitChanged(`archive-files-changed-${folder}`);
  },

  refreshFolders_meta: 'post',
  async refreshFolders() {
    socket.emitChanged(`archive-folders-changed`);
  },

  deleteFile_meta: 'post',
  async deleteFile({ folder, file }) {
    await fs.unlink(path.join(resolveArchiveFolder(folder), `${file}.jsonl`));
    socket.emitChanged(`archive-files-changed-${folder}`);
  },

  renameFile_meta: 'post',
  async renameFile({ folder, file, newFile }) {
    await fs.rename(path.join(resolveArchiveFolder(folder), `${file}.jsonl`), path.join(resolveArchiveFolder(folder), `${newFile}.jsonl`));
    socket.emitChanged(`archive-files-changed-${folder}`);
  },

  deleteFolder_meta: 'post',
  async deleteFolder({ folder }) {
    if (!folder) throw new Error('Missing folder parameter');
    if (folder.endsWith('.link')) {
      await fs.unlink(path.join(archivedir(), folder));
    } else {
      await fs.rmdir(path.join(archivedir(), folder), { recursive: true });
    }
    socket.emitChanged(`archive-folders-changed`);
  },

  saveFreeTable_meta: 'post',
  async saveFreeTable({ folder, file, data }) {
    saveFreeTableData(path.join(resolveArchiveFolder(folder), `${file}.jsonl`), data);
    return true;
  },

  loadFreeTable_meta: 'post',
  async loadFreeTable({ folder, file }) {
    return new Promise((resolve, reject) => {
      const fileStream = fs.createReadStream(path.join(resolveArchiveFolder(folder), `${file}.jsonl`));
      const liner = readline.createInterface({
        input: fileStream,
      });
      let structure = null;
      const rows = [];
      liner.on('line', line => {
        const data = JSON.parse(line);
        if (structure) rows.push(data);
        else structure = data;
      });
      liner.on('close', () => {
        resolve({ structure, rows });
        fileStream.close();
      });
    });
  },

  async getNewArchiveFolder({ database }) {
    if (!(await fs.exists(path.join(archivedir(), database)))) return database;
    let index = 2;
    while (await fs.exists(path.join(archivedir(), `${database}${index}`))) {
      index += 1;
    }
    return `${database}${index}`;
  },
};
