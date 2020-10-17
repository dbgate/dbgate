const fs = require('fs-extra');
const path = require('path');
const { archivedir } = require('../utility/directories');
const socket = require('../utility/socket');

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
};
