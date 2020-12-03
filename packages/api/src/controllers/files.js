const fs = require('fs-extra');
const path = require('path');
const { filesdir } = require('../utility/directories');
const socket = require('../utility/socket');
const scheduler = require('./scheduler');

function serialize(format, data) {
  if (format == 'text') return data;
  if (format == 'json') return JSON.stringify(data);
  throw new Error(`Invalid format: ${format}`);
}

function deserialize(format, text) {
  if (format == 'text') return text;
  if (format == 'json') return JSON.parse(text);
  throw new Error(`Invalid format: ${format}`);
}

module.exports = {
  list_meta: 'get',
  async list({ folder }) {
    const dir = path.join(filesdir(), folder);
    if (!(await fs.exists(dir))) return [];
    const files = (await fs.readdir(dir)).map((file) => ({ folder, file }));
    return files;
  },

  delete_meta: 'post',
  async delete({ folder, file }) {
    await fs.unlink(path.join(filesdir(), folder, file));
    socket.emitChanged(`files-changed-${folder}`);
  },

  load_meta: 'post',
  async load({ folder, file, format }) {
    const text = await fs.readFile(path.join(filesdir(), folder, file), { encoding: 'utf-8' });
    return deserialize(format, text);
  },

  save_meta: 'post',
  async save({ folder, file, data, format }) {
    const dir = path.join(filesdir(), folder);
    if (!(await fs.exists(dir))) {
      await fs.mkdir(dir);
    }
    await fs.writeFile(path.join(dir, file), serialize(format, data));
    socket.emitChanged(`files-changed-${folder}`);
    if (folder == 'shell') {
      scheduler.reload();
    }
  },
};
