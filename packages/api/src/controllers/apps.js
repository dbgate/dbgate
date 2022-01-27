const fs = require('fs-extra');
const _ = require('lodash');
const path = require('path');
const { appdir } = require('../utility/directories');
const socket = require('../utility/socket');
const connections = require('./connections');

module.exports = {
  folders_meta: true,
  async folders() {
    const folders = await fs.readdir(appdir());
    return [
      ...folders.map(name => ({
        name,
      })),
    ];
  },

  createFolder_meta: true,
  async createFolder({ folder }) {
    await fs.mkdir(path.join(appdir(), folder));
    socket.emitChanged('app-folders-changed');
    return true;
  },

  files_meta: true,
  async files({ folder }) {
    const dir = path.join(appdir(), folder);
    if (!(await fs.exists(dir))) return [];
    const files = await fs.readdir(dir);

    function fileType(ext, type) {
      return files
        .filter(name => name.endsWith(ext))
        .map(name => ({
          name: name.slice(0, -ext.length),
          label: path.parse(name.slice(0, -ext.length)).base,
          type,
        }));
    }

    function refsType() {
      return files
        .filter(name => name == 'virtual-references.json')
        .map(name => ({
          name: 'virtual-references.json',
          label: 'virtual-references.json',
          type: 'vfk',
        }));
    }

    return [...refsType(), ...fileType('.command.sql', 'command.sql'), ...fileType('.query.sql', 'query.sql')];
  },

  async emitChangedDbApp(folder) {
    for (const conn of await connections.list()) {
      for (const db of conn.databases || []) {
        if (db[`useApp:${folder}`]) {
          socket.emitChanged(`db-apps-changed-${conn._id}-${db.name}`);
        }
      }
    }
  },

  refreshFiles_meta: true,
  async refreshFiles({ folder }) {
    socket.emitChanged(`app-files-changed-${folder}`);
  },

  refreshFolders_meta: true,
  async refreshFolders() {
    socket.emitChanged(`app-folders-changed`);
  },

  deleteFile_meta: true,
  async deleteFile({ folder, file, fileType }) {
    await fs.unlink(path.join(appdir(), folder, `${file}.${fileType}`));
    socket.emitChanged(`app-files-changed-${folder}`);
    this.emitChangedDbApp(folder);
  },

  renameFile_meta: true,
  async renameFile({ folder, file, newFile, fileType }) {
    await fs.rename(
      path.join(path.join(appdir(), folder), `${file}.${fileType}`),
      path.join(path.join(appdir(), folder), `${newFile}.${fileType}`)
    );
    socket.emitChanged(`app-files-changed-${folder}`);
    this.emitChangedDbApp(folder);
  },

  renameFolder_meta: true,
  async renameFolder({ folder, newFolder }) {
    const uniqueName = await this.getNewAppFolder({ name: newFolder });
    await fs.rename(path.join(appdir(), folder), path.join(appdir(), uniqueName));
    socket.emitChanged(`app-folders-changed`);
  },

  deleteFolder_meta: true,
  async deleteFolder({ folder }) {
    if (!folder) throw new Error('Missing folder parameter');
    await fs.rmdir(path.join(appdir(), folder), { recursive: true });
    socket.emitChanged(`app-folders-changed`);
  },

  async getNewAppFolder({ name }) {
    if (!(await fs.exists(path.join(appdir(), name)))) return name;
    let index = 2;
    while (await fs.exists(path.join(appdir(), `${name}${index}`))) {
      index += 1;
    }
    return `${name}${index}`;
  },

  getAppsForDb_meta: true,
  async getAppsForDb({ conid, database }) {
    const connection = await connections.get({ conid });
    if (!connection) return [];
    const db = (connection.databases || []).find(x => x.name == database);
    const apps = [];
    const res = [];
    if (db) {
      for (const key of _.keys(db || {})) {
        if (key.startsWith('useApp:') && db[key]) {
          apps.push(key.substring('useApp:'.length));
        }
      }
    }
    console.log('APPS', apps);
    for (const folder of apps) {
      res.push(await this.loadApp({ folder }));
    }
    return res;
  },

  loadApp_meta: true,
  async loadApp({ folder }) {
    const res = {
      queries: [],
      commands: [],
      name: folder,
    };
    const dir = path.join(appdir(), folder);
    if (await fs.exists(dir)) {
      const files = await fs.readdir(dir);

      async function processType(ext, field) {
        for (const file of files) {
          if (file.endsWith(ext)) {
            res[field].push({
              name: file.slice(0, -ext.length),
              sql: await fs.readFile(path.join(dir, file), { encoding: 'utf-8' }),
            });
          }
        }
      }

      await processType('.command.sql', 'commands');
      await processType('.query.sql', 'queries');
    }

    return res;
  },
};
