const fs = require('fs-extra');
const readline = require('readline');
const path = require('path');
const { archivedir, clearArchiveLinksCache, resolveArchiveFolder } = require('../utility/directories');
const socket = require('../utility/socket');
const { saveFreeTableData } = require('../utility/freeTableStorage');
const loadFilesRecursive = require('../utility/loadFilesRecursive');

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

  files_meta: true,
  async files({ folder }) {
    try {
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
      console.log('Error reading archive files', err.message);
      return [];
    }
  },

  refreshFiles_meta: true,
  async refreshFiles({ folder }) {
    socket.emitChanged(`archive-files-changed-${folder}`);
  },

  refreshFolders_meta: true,
  async refreshFolders() {
    socket.emitChanged(`archive-folders-changed`);
  },

  deleteFile_meta: true,
  async deleteFile({ folder, file, fileType }) {
    await fs.unlink(path.join(resolveArchiveFolder(folder), `${file}.${fileType}`));
    socket.emitChanged(`archive-files-changed-${folder}`);
  },

  renameFile_meta: true,
  async renameFile({ folder, file, newFile, fileType }) {
    await fs.rename(
      path.join(resolveArchiveFolder(folder), `${file}.${fileType}`),
      path.join(resolveArchiveFolder(folder), `${newFile}.${fileType}`)
    );
    socket.emitChanged(`archive-files-changed-${folder}`);
  },

  renameFolder_meta: true,
  async renameFolder({ folder, newFolder }) {
    const uniqueName = await this.getNewArchiveFolder({ database: newFolder });
    await fs.rename(path.join(archivedir(), folder), path.join(archivedir(), uniqueName));
    socket.emitChanged(`archive-folders-changed`);
  },

  deleteFolder_meta: true,
  async deleteFolder({ folder }) {
    if (!folder) throw new Error('Missing folder parameter');
    if (folder.endsWith('.link')) {
      await fs.unlink(path.join(archivedir(), folder));
    } else {
      await fs.rmdir(path.join(archivedir(), folder), { recursive: true });
    }
    socket.emitChanged(`archive-folders-changed`);
  },

  saveFreeTable_meta: true,
  async saveFreeTable({ folder, file, data }) {
    await saveFreeTableData(path.join(resolveArchiveFolder(folder), `${file}.jsonl`), data);
    socket.emitChanged(`archive-files-changed-${folder}`);
    return true;
  },

  loadFreeTable_meta: true,
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

  saveText_meta: true,
  async saveText({ folder, file, text }) {
    await fs.writeFile(path.join(resolveArchiveFolder(folder), `${file}.jsonl`), text);
    socket.emitChanged(`archive-files-changed-${folder}`);
    return true;
  },

  async getNewArchiveFolder({ database }) {
    const isLink = database.endsWith(database);
    const name = isLink ? database.slice(0, -5) : database;
    const suffix = isLink ? '.link' : '';
    if (!(await fs.exists(path.join(archivedir(), database)))) return database;
    let index = 2;
    while (await fs.exists(path.join(archivedir(), `${name}${index}${suffix}`))) {
      index += 1;
    }
    return `${name}${index}${suffix}`;
  },
};
