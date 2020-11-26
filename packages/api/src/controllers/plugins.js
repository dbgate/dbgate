const fs = require('fs-extra');
const fetch = require('node-fetch');
const path = require('path');
const pacote = require('pacote');
const { pluginstmpdir, pluginsdir } = require('../utility/directories');
const socket = require('../utility/socket');
const requirePlugin = require('../shell/requirePlugin');

async function loadPackageInfo(dir) {
  const readmeFile = path.join(dir, 'README.md');
  const packageFile = path.join(dir, 'package.json');

  if (!(await fs.exists(packageFile))) {
    return null;
  }

  let readme = null;
  let manifest = null;
  if (await fs.exists(readmeFile)) readme = await fs.readFile(readmeFile, { encoding: 'utf-8' });
  if (await fs.exists(packageFile)) manifest = JSON.parse(await fs.readFile(packageFile, { encoding: 'utf-8' }));
  return {
    readme,
    manifest,
  };
}

module.exports = {
  script_meta: 'get',
  async script({ packageName }) {
    const file = path.join(pluginsdir(), packageName, 'dist', 'frontend.js');
    const data = await fs.readFile(file, {
      encoding: 'utf-8',
    });
    return data;
  },

  search_meta: 'get',
  async search({ filter }) {
    // const response = await fetch(`https://api.npms.io/v2/search?q=keywords:dbgate ${encodeURIComponent(filter)}`);
    // const json = await response.json();
    // const { results } = json || {};
    // return (results || []).map((x) => x.package);

    // DOCS: https://github.com/npm/registry/blob/master/docs/REGISTRY-API.md#get-v1search
    const response = await fetch(
      `http://registry.npmjs.com/-/v1/search?text=${encodeURIComponent(filter)}+keywords:dbgateplugin&size=25&from=0`
    );
    const json = await response.json();
    const { objects } = json || {};
    return (objects || []).map((x) => x.package);
  },

  info_meta: 'get',
  async info({ packageName }) {
    const dir = path.join(pluginstmpdir(), packageName);
    if (!(await fs.exists(dir))) {
      await pacote.extract(packageName, dir);
    }
    return await loadPackageInfo(dir);
    // return await {
    //   ...loadPackageInfo(dir),
    //   installed: loadPackageInfo(path.join(pluginsdir(), packageName)),
    // };
  },

  installed_meta: 'get',
  async installed() {
    const files = await fs.readdir(pluginsdir());
    return await Promise.all(
      files.map((packageName) =>
        fs.readFile(path.join(pluginsdir(), packageName, 'package.json')).then((x) => JSON.parse(x))
      )
    );
  },

  install_meta: 'post',
  async install({ packageName }) {
    const dir = path.join(pluginsdir(), packageName);
    if (!(await fs.exists(dir))) {
      await pacote.extract(packageName, dir);
    }
    socket.emitChanged(`installed-plugins-changed`);
  },

  uninstall_meta: 'post',
  async uninstall({ packageName }) {
    const dir = path.join(pluginsdir(), packageName);
    await fs.rmdir(dir, { recursive: true });
    socket.emitChanged(`installed-plugins-changed`);
  },

  command_meta: 'post',
  async command({ packageName, command, args }) {
    const content = requirePlugin(packageName);
    return content.commands[command](args);
  },
};
