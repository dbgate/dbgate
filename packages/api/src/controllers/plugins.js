const fs = require('fs-extra');
const axios = require('axios');
const path = require('path');
const { extractPackageName } = require('dbgate-tools');
const { pluginsdir, datadir } = require('../utility/directories');
const socket = require('../utility/socket');
const compareVersions = require('compare-versions');
const requirePlugin = require('../shell/requirePlugin');
const downloadPackage = require('../utility/downloadPackage');
const hasPermission = require('../utility/hasPermission');

// async function loadPackageInfo(dir) {
//   const readmeFile = path.join(dir, 'README.md');
//   const packageFile = path.join(dir, 'package.json');

//   if (!(await fs.exists(packageFile))) {
//     return null;
//   }

//   let readme = null;
//   let manifest = null;
//   if (await fs.exists(readmeFile)) readme = await fs.readFile(readmeFile, { encoding: 'utf-8' });
//   if (await fs.exists(packageFile)) manifest = JSON.parse(await fs.readFile(packageFile, { encoding: 'utf-8' }));
//   return {
//     readme,
//     manifest,
//   };
// }

const preinstallPluginMinimalVersions = {
  'dbgate-plugin-mssql': '1.1.0',
  'dbgate-plugin-mysql': '1.1.0',
  'dbgate-plugin-postgres': '1.1.0',
  'dbgate-plugin-csv': '1.0.8',
  'dbgate-plugin-excel': '1.0.6',
};

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
    // DOCS: https://github.com/npm/registry/blob/master/docs/REGISTRY-API.md#get-v1search
    const resp = await axios.default.get(
      `http://registry.npmjs.com/-/v1/search?text=${encodeURIComponent(filter)}+keywords:dbgateplugin&size=25&from=0`
    );
    const { objects } = resp.data || {};
    return (objects || []).map(x => x.package);
  },

  info_meta: 'get',
  async info({ packageName }) {
    try {
      const infoResp = await axios.default.get(`https://registry.npmjs.org/${packageName}`);
      const { latest } = infoResp.data['dist-tags'];
      const manifest = infoResp.data.versions[latest];
      const { readme } = infoResp.data;

      return {
        readme,
        manifest,
      };
    } catch (err) {
      return {
        state: 'error',
        error: err.message,
      };
    }

    // const dir = path.join(pluginstmpdir(), packageName);
    // if (!(await fs.exists(dir))) {
    //   await downloadPackage(packageName, dir);
    // }
    // return await loadPackageInfo(dir);
    // return await {
    //   ...loadPackageInfo(dir),
    //   installed: loadPackageInfo(path.join(pluginsdir(), packageName)),
    // };
  },

  installed_meta: 'get',
  async installed() {
    const files = await fs.readdir(pluginsdir());
    const res = [];
    for (const packageName of files) {
      const manifest = await fs.readFile(path.join(pluginsdir(), packageName, 'package.json')).then(x => JSON.parse(x));
      const readmeFile = path.join(pluginsdir(), packageName, 'README.md');
      if (await fs.exists(readmeFile)) {
        manifest.readme = await fs.readFile(readmeFile, { encoding: 'utf-8' });
      }
      res.push(manifest);
    }
    return res;
    // const res = await Promise.all(
    //   files.map((packageName) =>
    //     fs.readFile(path.join(pluginsdir(), packageName, 'package.json')).then((x) => JSON.parse(x))
    //   )
    // );
  },

  async saveRemovePlugins() {
    await fs.writeFile(path.join(datadir(), 'removed-plugins'), this.removedPlugins.join('\n'));
  },

  install_meta: 'post',
  async install({ packageName }) {
    if (!hasPermission(`plugins/install`)) return;
    const dir = path.join(pluginsdir(), packageName);
    if (!(await fs.exists(dir))) {
      await downloadPackage(packageName, dir);
    }
    socket.emitChanged(`installed-plugins-changed`);
    this.removedPlugins = this.removedPlugins.filter(x => x != packageName);
    await this.saveRemovePlugins();
  },

  uninstall_meta: 'post',
  async uninstall({ packageName }) {
    if (!hasPermission(`plugins/install`)) return;
    const dir = path.join(pluginsdir(), packageName);
    await fs.rmdir(dir, { recursive: true });
    socket.emitChanged(`installed-plugins-changed`);
    this.removedPlugins.push(packageName);
    await this.saveRemovePlugins();
  },

  upgrade_meta: 'post',
  async upgrade({ packageName }) {
    if (!hasPermission(`plugins/install`)) return;
    const dir = path.join(pluginsdir(), packageName);
    if (await fs.exists(dir)) {
      await fs.rmdir(dir, { recursive: true });
      await downloadPackage(packageName, dir);
    }

    socket.emitChanged(`installed-plugins-changed`);
  },

  command_meta: 'post',
  async command({ packageName, command, args }) {
    const content = requirePlugin(packageName);
    return content.commands[command](args);
  },

  authTypes_meta: 'post',
  async authTypes({ engine }) {
    const packageName = extractPackageName(engine);
    const content = requirePlugin(packageName);
    if (!content.driver || content.driver.engine != engine || !content.driver.getAuthTypes) return null;
    return content.driver.getAuthTypes() || null;
  },

  async _init() {
    const installed = await this.installed();
    try {
      this.removedPlugins = (await fs.readFile(path.join(datadir(), 'removed-plugins'), { encoding: 'utf-8' })).split(
        '\n'
      );
    } catch (err) {
      this.removedPlugins = [];
    }

    for (const packageName of Object.keys(preinstallPluginMinimalVersions)) {
      const installedVersion = installed.find(x => x.name == packageName);
      if (installedVersion) {
        // plugin installed, test, whether upgrade
        const requiredVersion = preinstallPluginMinimalVersions[packageName];
        if (compareVersions(installedVersion.version, requiredVersion) < 0) {
          console.log(
            `Upgrading preinstalled plugin ${packageName}, found ${installedVersion.version}, required version ${requiredVersion}`
          );
          await this.upgrade({ packageName });
        } else {
          console.log(
            `Plugin ${packageName} not upgraded, found ${installedVersion.version}, required version ${requiredVersion}`
          );
        }

        continue;
      }

      if (this.removedPlugins.includes(packageName)) {
        // plugin was remvoed, don't install again
        continue;
      }

      try {
        console.log('Preinstalling plugin', packageName);
        await this.install({ packageName });
      } catch (err) {
        console.error('Error preinstalling plugin', packageName, err);
      }
    }
  },
};
