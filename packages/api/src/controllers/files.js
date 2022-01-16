const uuidv1 = require('uuid/v1');
const fs = require('fs-extra');
const path = require('path');
const { filesdir, archivedir, resolveArchiveFolder, uploadsdir } = require('../utility/directories');
const getChartExport = require('../utility/getChartExport');
const hasPermission = require('../utility/hasPermission');
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
  list_meta: true,
  async list({ folder }) {
    if (!hasPermission(`files/${folder}/read`)) return [];
    const dir = path.join(filesdir(), folder);
    if (!(await fs.exists(dir))) return [];
    const files = (await fs.readdir(dir)).map(file => ({ folder, file }));
    return files;
  },

  listAll_meta: true,
  async listAll() {
    const folders = await fs.readdir(filesdir());
    const res = [];
    for (const folder of folders) {
      if (!hasPermission(`files/${folder}/read`)) continue;
      const dir = path.join(filesdir(), folder);
      const files = (await fs.readdir(dir)).map(file => ({ folder, file }));
      res.push(...files);
    }
    return res;
  },

  delete_meta: true,
  async delete({ folder, file }) {
    if (!hasPermission(`files/${folder}/write`)) return;
    await fs.unlink(path.join(filesdir(), folder, file));
    socket.emitChanged(`files-changed-${folder}`);
    socket.emitChanged(`all-files-changed`);
  },

  rename_meta: true,
  async rename({ folder, file, newFile }) {
    if (!hasPermission(`files/${folder}/write`)) return;
    await fs.rename(path.join(filesdir(), folder, file), path.join(filesdir(), folder, newFile));
    socket.emitChanged(`files-changed-${folder}`);
    socket.emitChanged(`all-files-changed`);
  },

  copy_meta: true,
  async copy({ folder, file, newFile }) {
    if (!hasPermission(`files/${folder}/write`)) return;
    await fs.copyFile(path.join(filesdir(), folder, file), path.join(filesdir(), folder, newFile));
    socket.emitChanged(`files-changed-${folder}`);
    socket.emitChanged(`all-files-changed`);
  },

  load_meta: true,
  async load({ folder, file, format }) {
    if (folder.startsWith('archive:')) {
      const text = await fs.readFile(path.join(resolveArchiveFolder(folder.substring('archive:'.length)), file), {
        encoding: 'utf-8',
      });
      return deserialize(format, text);
    } else {
      if (!hasPermission(`files/${folder}/read`)) return null;
      const text = await fs.readFile(path.join(filesdir(), folder, file), { encoding: 'utf-8' });
      return deserialize(format, text);
    }
  },

  save_meta: true,
  async save({ folder, file, data, format }) {
    if (folder.startsWith('archive:')) {
      const dir = resolveArchiveFolder(folder.substring('archive:'.length));
      await fs.writeFile(path.join(dir, file), serialize(format, data));
      socket.emitChanged(`archive-files-changed-${folder.substring('archive:'.length)}`);
      return true;
    } else {
      if (!hasPermission(`files/${folder}/write`)) return false;
      const dir = path.join(filesdir(), folder);
      if (!(await fs.exists(dir))) {
        await fs.mkdir(dir);
      }
      await fs.writeFile(path.join(dir, file), serialize(format, data));
      socket.emitChanged(`files-changed-${folder}`);
      socket.emitChanged(`all-files-changed`);
      if (folder == 'shell') {
        scheduler.reload();
      }
      return true;
    }
  },

  saveAs_meta: true,
  async saveAs({ filePath, data, format }) {
    await fs.writeFile(filePath, serialize(format, data));
  },

  favorites_meta: true,
  async favorites() {
    if (!hasPermission(`files/favorites/read`)) return [];
    const dir = path.join(filesdir(), 'favorites');
    if (!(await fs.exists(dir))) return [];
    const files = await fs.readdir(dir);
    const res = [];
    for (const file of files) {
      const filePath = path.join(dir, file);
      const text = await fs.readFile(filePath, { encoding: 'utf-8' });
      res.push({
        file,
        folder: 'favorites',
        ...JSON.parse(text),
      });
    }
    return res;
  },

  generateUploadsFile_meta: true,
  async generateUploadsFile() {
    const fileName = `${uuidv1()}.html`;
    return {
      fileName,
      filePath: path.join(uploadsdir(), fileName),
    };
  },

  exportChart_meta: true,
  async exportChart({ filePath, title, config, image }) {
    const fileName = path.parse(filePath).base;
    const imageFile = fileName.replace('.html', '-preview.png');
    const html = getChartExport(title, config, imageFile);
    await fs.writeFile(filePath, html);
    if (image) {
      const index = image.indexOf('base64,');
      if (index > 0) {
        const data = image.substr(index + 'base64,'.length);
        const buf = Buffer.from(data, 'base64');
        await fs.writeFile(filePath.replace('.html', '-preview.png'), buf);
      }
    }
    return true;
  },
};
