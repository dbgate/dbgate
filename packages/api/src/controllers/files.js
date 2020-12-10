const fs = require('fs-extra');
const path = require('path');
const { filesdir } = require('../utility/directories');
const hasPermission = require('../utility/hasPermission');
const socket = require('../utility/socket');
const scheduler = require('./scheduler');

const markdownAutorunRegex = /<\!--.*@autorun\s*(\n.*-->|-->)/s;
const markdownButtonRegex = /<\!--.*@button\s+([^\n]+)(\n.*-->|-->)/s;
const markdownIconRegex = /<\!--.*@icon\s+([^\n]+)(\n.*-->|-->)/s;

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
    if (!hasPermission(`files/${folder}/read`)) return [];
    const dir = path.join(filesdir(), folder);
    if (!(await fs.exists(dir))) return [];
    const files = (await fs.readdir(dir)).map((file) => ({ folder, file }));
    return files;
  },

  delete_meta: 'post',
  async delete({ folder, file }) {
    if (!hasPermission(`files/${folder}/write`)) return;
    await fs.unlink(path.join(filesdir(), folder, file));
    socket.emitChanged(`files-changed-${folder}`);
  },

  rename_meta: 'post',
  async rename({ folder, file, newFile }) {
    if (!hasPermission(`files/${folder}/write`)) return;
    await fs.rename(path.join(filesdir(), folder, file), path.join(filesdir(), folder, newFile));
    socket.emitChanged(`files-changed-${folder}`);
  },

  load_meta: 'post',
  async load({ folder, file, format }) {
    if (!hasPermission(`files/${folder}/read`)) return null;
    const text = await fs.readFile(path.join(filesdir(), folder, file), { encoding: 'utf-8' });
    return deserialize(format, text);
  },

  save_meta: 'post',
  async save({ folder, file, data, format }) {
    if (!hasPermission(`files/${folder}/write`)) return;
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

  markdownManifest_meta: 'get',
  async markdownManifest() {
    if (!hasPermission(`files/markdown/read`)) return [];
    const dir = path.join(filesdir(), 'markdown');
    if (!(await fs.exists(dir))) return [];
    const files = await fs.readdir(dir);
    const res = [];
    for (const file of files) {
      const filePath = path.join(dir, file);
      const text = await fs.readFile(filePath, { encoding: 'utf-8' });
      const autorun = text.match(markdownAutorunRegex);
      const button = text.match(markdownButtonRegex);
      const icon = text.match(markdownIconRegex);
      if (autorun || button) {
        res.push({
          file,
          autorun: !!autorun,
          button: button ? button[1].trim() : undefined,
          icon: icon ? icon[1].trim() : undefined,
        });
      }
    }
    return res;
  },
};
