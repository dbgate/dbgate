const fs = require('fs-extra');
const path = require('path');
const crypto = require('crypto');
const { filesdir, archivedir, resolveArchiveFolder, uploadsdir, appdir } = require('../utility/directories');
const getChartExport = require('../utility/getChartExport');
const { hasPermission } = require('../utility/hasPermission');
const socket = require('../utility/socket');
const scheduler = require('./scheduler');
const getDiagramExport = require('../utility/getDiagramExport');
const apps = require('./apps');
const getMapExport = require('../utility/getMapExport');

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
  async list({ folder }, req) {
    if (!hasPermission(`files/${folder}/read`, req)) return [];
    const dir = path.join(filesdir(), folder);
    if (!(await fs.exists(dir))) return [];
    const files = (await fs.readdir(dir)).map(file => ({ folder, file }));
    return files;
  },

  listAll_meta: true,
  async listAll(_params, req) {
    const folders = await fs.readdir(filesdir());
    const res = [];
    for (const folder of folders) {
      if (!hasPermission(`files/${folder}/read`, req)) continue;
      const dir = path.join(filesdir(), folder);
      const files = (await fs.readdir(dir)).map(file => ({ folder, file }));
      res.push(...files);
    }
    return res;
  },

  delete_meta: true,
  async delete({ folder, file }, req) {
    if (!hasPermission(`files/${folder}/write`, req)) return false;
    await fs.unlink(path.join(filesdir(), folder, file));
    socket.emitChanged(`files-changed`, { folder });
    socket.emitChanged(`all-files-changed`);
    return true;
  },

  rename_meta: true,
  async rename({ folder, file, newFile }, req) {
    if (!hasPermission(`files/${folder}/write`, req)) return false;
    await fs.rename(path.join(filesdir(), folder, file), path.join(filesdir(), folder, newFile));
    socket.emitChanged(`files-changed`, { folder });
    socket.emitChanged(`all-files-changed`);
    return true;
  },

  refresh_meta: true,
  async refresh({ folders }, req) {
    for (const folder of folders) {
      socket.emitChanged(`files-changed`, { folder });
      socket.emitChanged(`all-files-changed`);
    }
    return true;
  },

  copy_meta: true,
  async copy({ folder, file, newFile }, req) {
    if (!hasPermission(`files/${folder}/write`, req)) return false;
    await fs.copyFile(path.join(filesdir(), folder, file), path.join(filesdir(), folder, newFile));
    socket.emitChanged(`files-changed`, { folder });
    socket.emitChanged(`all-files-changed`);
    return true;
  },

  load_meta: true,
  async load({ folder, file, format }, req) {
    if (folder.startsWith('archive:')) {
      const text = await fs.readFile(path.join(resolveArchiveFolder(folder.substring('archive:'.length)), file), {
        encoding: 'utf-8',
      });
      return deserialize(format, text);
    } else if (folder.startsWith('app:')) {
      const text = await fs.readFile(path.join(appdir(), folder.substring('app:'.length), file), {
        encoding: 'utf-8',
      });
      return deserialize(format, text);
    } else {
      if (!hasPermission(`files/${folder}/read`, req)) return null;
      const text = await fs.readFile(path.join(filesdir(), folder, file), { encoding: 'utf-8' });
      return deserialize(format, text);
    }
  },

  loadFrom_meta: true,
  async loadFrom({ filePath, format }, req) {
    const text = await fs.readFile(filePath, { encoding: 'utf-8' });
    return deserialize(format, text);
  },

  save_meta: true,
  async save({ folder, file, data, format }, req) {
    if (folder.startsWith('archive:')) {
      if (!hasPermission(`archive/write`, req)) return false;
      const dir = resolveArchiveFolder(folder.substring('archive:'.length));
      await fs.writeFile(path.join(dir, file), serialize(format, data));
      socket.emitChanged(`archive-files-changed`, { folder: folder.substring('archive:'.length) });
      return true;
    } else if (folder.startsWith('app:')) {
      if (!hasPermission(`apps/write`, req)) return false;
      const app = folder.substring('app:'.length);
      await fs.writeFile(path.join(appdir(), app, file), serialize(format, data));
      socket.emitChanged(`app-files-changed`, { app });
      socket.emitChanged('used-apps-changed');
      apps.emitChangedDbApp(folder);
      return true;
    } else {
      if (!hasPermission(`files/${folder}/write`, req)) return false;
      const dir = path.join(filesdir(), folder);
      if (!(await fs.exists(dir))) {
        await fs.mkdir(dir);
      }
      await fs.writeFile(path.join(dir, file), serialize(format, data));
      socket.emitChanged(`files-changed`, { folder });
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
  async favorites(_params, req) {
    if (!hasPermission(`files/favorites/read`, req)) return [];
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
  async generateUploadsFile({ extension }) {
    const fileName = `${crypto.randomUUID()}.${extension || 'html'}`;
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

  exportMap_meta: true,
  async exportMap({ filePath, geoJson }) {
    await fs.writeFile(filePath, getMapExport(geoJson));
    return true;
  },

  exportDiagram_meta: true,
  async exportDiagram({ filePath, html, css, themeType, themeClassName }) {
    await fs.writeFile(filePath, getDiagramExport(html, css, themeType, themeClassName));
    return true;
  },

  getFileRealPath_meta: true,
  async getFileRealPath({ folder, file }, req) {
    if (folder.startsWith('archive:')) {
      if (!hasPermission(`archive/write`, req)) return false;
      const dir = resolveArchiveFolder(folder.substring('archive:'.length));
      return path.join(dir, file);
    } else if (folder.startsWith('app:')) {
      if (!hasPermission(`apps/write`, req)) return false;
      const app = folder.substring('app:'.length);
      return path.join(appdir(), app, file);
    } else {
      if (!hasPermission(`files/${folder}/write`, req)) return false;
      const dir = path.join(filesdir(), folder);
      if (!(await fs.exists(dir))) {
        await fs.mkdir(dir);
      }
      return path.join(dir, file);
    }
  },
};
