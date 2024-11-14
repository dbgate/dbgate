const fs = require('fs-extra');
const axios = require('axios');
const path = require('path');
const { extractPackageName } = require('dbgate-tools');
const { pluginsdir, packagedPluginsDir } = require('../utility/directories');
const socket = require('../utility/socket');
const compareVersions = require('compare-versions');
const requirePlugin = require('../shell/requirePlugin');
const downloadPackage = require('../utility/downloadPackage');
const { hasPermission } = require('../utility/hasPermission');
const _ = require('lodash');
const packagedPluginsContent = require('../packagedPluginsContent');

module.exports = {
  script_meta: true,
  async script({ packageName }) {
    const packagedContent = packagedPluginsContent();

    if (packagedContent && packagedContent[packageName]) {
      return packagedContent[packageName].frontend;
    }

    const file1 = path.join(packagedPluginsDir(), packageName, 'dist', 'frontend.js');
    const file2 = path.join(pluginsdir(), packageName, 'dist', 'frontend.js');
    // @ts-ignore
    const file = (await fs.exists(file1)) ? file1 : file2;
    const data = await fs.readFile(file, {
      encoding: 'utf-8',
    });
    return data;
  },

  search_meta: true,
  async search({ filter }) {
    // DOCS: https://github.com/npm/registry/blob/master/docs/REGISTRY-API.md#get-v1search
    const resp = await axios.default.get(
      `http://registry.npmjs.com/-/v1/search?text=${encodeURIComponent(filter)}+keywords:dbgateplugin&size=25&from=0`
    );
    const { objects } = resp.data || {};
    return (objects || []).map(x => x.package);
  },

  info_meta: true,
  async info({ packageName }) {
    // @ts-ignore
    const isPackaged = await fs.exists(path.join(packagedPluginsDir(), packageName));

    try {
      const infoResp = await axios.default.get(`https://registry.npmjs.org/${packageName}`);
      const { latest } = infoResp.data['dist-tags'];
      const manifest = infoResp.data.versions[latest];
      const { readme } = infoResp.data;

      return {
        readme,
        manifest,
        isPackaged,
      };
    } catch (err) {
      return {
        isPackaged,
        state: 'error',
        error: err.message,
      };
    }
  },

  installed_meta: true,
  async installed() {
    const packagedContent = packagedPluginsContent();

    const files1 = packagedContent ? _.keys(packagedContent) : await fs.readdir(packagedPluginsDir());
    const files2 = await fs.readdir(pluginsdir());

    const res = [];
    for (const packageName of _.union(files1, files2)) {
      if (packageName == 'dist') continue;
      if (!/^dbgate-plugin-.*$/.test(packageName)) continue;
      try {
        if (packagedContent && packagedContent[packageName]) {
          const manifest = {
            ...packagedContent[packageName].manifest,
          };
          manifest.isPackaged = true;
          manifest.readme = packagedContent[packageName].readme;
          res.push(manifest);
        } else {
          const isPackaged = files1.includes(packageName);
          const manifest = await fs
            .readFile(path.join(isPackaged ? packagedPluginsDir() : pluginsdir(), packageName, 'package.json'), {
              encoding: 'utf-8',
            })
            .then(x => JSON.parse(x));
          if (!manifest.keywords) {
            continue;
          }
          if (!manifest.keywords.includes('dbgateplugin') && !manifest.keywords.includes('dbgatebuiltin')) {
            continue;
          }
          const readmeFile = path.join(isPackaged ? packagedPluginsDir() : pluginsdir(), packageName, 'README.md');
          // @ts-ignore
          if (await fs.exists(readmeFile)) {
            manifest.readme = await fs.readFile(readmeFile, { encoding: 'utf-8' });
          }
          manifest.isPackaged = isPackaged;
          res.push(manifest);
        }
      } catch (err) {
        console.log(`Skipped plugin ${packageName}, error:`, err.message);
      }
    }
    return res;
  },

  // async saveRemovePlugins() {
  //   await fs.writeFile(path.join(datadir(), 'removed-plugins'), this.removedPlugins.join('\n'));
  // },

  install_meta: true,
  async install({ packageName }, req) {
    if (!hasPermission(`plugins/install`, req)) return;
    const dir = path.join(pluginsdir(), packageName);
    // @ts-ignore
    if (!(await fs.exists(dir))) {
      await downloadPackage(packageName, dir);
    }
    socket.emitChanged(`installed-plugins-changed`);
    // this.removedPlugins = this.removedPlugins.filter(x => x != packageName);
    // await this.saveRemovePlugins();
    return true;
  },

  uninstall_meta: true,
  async uninstall({ packageName }, req) {
    if (!hasPermission(`plugins/install`, req)) return;
    const dir = path.join(pluginsdir(), packageName);
    await fs.rmdir(dir, { recursive: true });
    socket.emitChanged(`installed-plugins-changed`);
    // this.removedPlugins.push(packageName);
    // await this.saveRemovePlugins();
    return true;
  },

  upgrade_meta: true,
  async upgrade({ packageName }, req) {
    if (!hasPermission(`plugins/install`, req)) return;
    const dir = path.join(pluginsdir(), packageName);
    // @ts-ignore
    if (await fs.exists(dir)) {
      await fs.rmdir(dir, { recursive: true });
      await downloadPackage(packageName, dir);
    }

    socket.emitChanged(`installed-plugins-changed`);
    return true;
  },

  command_meta: true,
  async command({ packageName, command, args }) {
    const content = requirePlugin(packageName);
    return content.commands[command](args);
  },

  authTypes_meta: true,
  async authTypes({ engine }) {
    const packageName = extractPackageName(engine);
    if (!packageName) return null;
    const content = requirePlugin(packageName);
    const driver = content.drivers.find(x => x.engine == engine);
    if (!driver || !driver.getAuthTypes) return null;
    return driver.getAuthTypes() || null;
  },

  // async _init() {
  //   const installed = await this.installed();
  //   try {
  //     this.removedPlugins = (await fs.readFile(path.join(datadir(), 'removed-plugins'), { encoding: 'utf-8' })).split(
  //       '\n'
  //     );
  //   } catch (err) {
  //     this.removedPlugins = [];
  //   }

  //   for (const packageName of Object.keys(preinstallPluginMinimalVersions)) {
  //     const installedVersion = installed.find(x => x.name == packageName);
  //     if (installedVersion) {
  //       // plugin installed, test, whether upgrade
  //       const requiredVersion = preinstallPluginMinimalVersions[packageName];
  //       if (compareVersions(installedVersion.version, requiredVersion) < 0) {
  //         console.log(
  //           `Upgrading preinstalled plugin ${packageName}, found ${installedVersion.version}, required version ${requiredVersion}`
  //         );
  //         await this.upgrade({ packageName });
  //       } else {
  //         console.log(
  //           `Plugin ${packageName} not upgraded, found ${installedVersion.version}, required version ${requiredVersion}`
  //         );
  //       }

  //       continue;
  //     }

  //     if (this.removedPlugins.includes(packageName)) {
  //       // plugin was remvoed, don't install again
  //       continue;
  //     }

  //     try {
  //       console.log('Preinstalling plugin', packageName);
  //       await this.install({ packageName });
  //     } catch (err) {
  //       console.error('Error preinstalling plugin', packageName, err);
  //     }
  //   }
  // },
};
