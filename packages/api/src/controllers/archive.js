const fs = require('fs-extra');
const stream = require('stream');
const readline = require('readline');
const path = require('path');
const { formatWithOptions } = require('util');
const { archivedir } = require('../utility/directories');
const socket = require('../utility/socket');
const JsonLinesDatastore = require('../utility/JsonLinesDatastore');

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
        .filter((x) => x != 'default')
        .map((name) => ({
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

  files_meta: 'get',
  async files({ folder }) {
    const files = await fs.readdir(path.join(archivedir(), folder));
    return files
      .filter((name) => name.endsWith('.jsonl'))
      .map((name) => ({
        name: name.slice(0, -'.jsonl'.length),
        type: 'jsonl',
      }));
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
    await fs.unlink(path.join(archivedir(), folder, `${file}.jsonl`));
    socket.emitChanged(`archive-files-changed-${folder}`);
  },

  deleteFolder_meta: 'post',
  async deleteFolder({ folder }) {
    if (!folder) throw new Error('Missing folder parameter');
    await fs.rmdir(path.join(archivedir(), folder), { recursive: true });
    socket.emitChanged(`archive-folders-changed`);
  },

  saveFreeTable_meta: 'post',
  async saveFreeTable({ folder, file, data }) {
    const { structure, rows } = data;
    const fileStream = fs.createWriteStream(path.join(archivedir(), folder, `${file}.jsonl`));
    await fileStream.write(JSON.stringify(structure) + '\n');
    for (const row of rows) {
      await fileStream.write(JSON.stringify(row) + '\n');
    }
    await fileStream.close();
    return true;
  },

  loadFreeTable_meta: 'post',
  async loadFreeTable({ folder, file }) {
    return new Promise((resolve, reject) => {
      const fileStream = fs.createReadStream(path.join(archivedir(), folder, `${file}.jsonl`));
      const liner = readline.createInterface({
        input: fileStream,
      });
      let structure = null;
      const rows = [];
      liner.on('line', (line) => {
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
};
