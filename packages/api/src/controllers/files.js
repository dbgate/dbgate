const fs = require('fs-extra');
const path = require('path');
const { filesdir } = require('../utility/directories');
const socket = require('../utility/socket');

function serialize(folder, data) {
  if (folder == 'sql') return data;
  return JSON.stringify(data);
}

function deserialize(folder, text) {
  if (folder == 'sql') return text;
  return JSON.parse(text);
}

module.exports = {
  list_meta: 'get',
  async list({ folder }) {
    const dir = path.join(filesdir(), folder);
    if (!(await fs.exists(dir))) return [];
    const files = (await fs.readdir(dir)).map((name) => ({ name }));
    return files;
  },

  delete_meta: 'post',
  async delete({ folder, file }) {
    await fs.unlink(path.join(filesdir(), folder, file));
    socket.emitChanged(`files-changed-${folder}`);
  },

  load_meta: 'post',
  async load({ folder, file }) {
    const text = await fs.readFile(path.join(filesdir(), folder, file), { encoding: 'utf-8' });
    return deserialize(folder, text);
  },

  save_meta: 'post',
  async save({ folder, file, data }) {
    const dir = path.join(filesdir(), folder);
    if (!(await fs.exists(dir))) {
      await fs.mkdir(dir);
    }
    await fs.writeFile(path.join(dir, file), serialize(folder, data));
    socket.emitChanged(`files-changed-${folder}`);
  },
};
