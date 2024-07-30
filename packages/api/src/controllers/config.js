const fs = require('fs-extra');
const os = require('os');
const path = require('path');
const axios = require('axios');
const { datadir, getLogsFilePath } = require('../utility/directories');
const { hasPermission } = require('../utility/hasPermission');
const socket = require('../utility/socket');
const _ = require('lodash');
const AsyncLock = require('async-lock');

const currentVersion = require('../currentVersion');
const platformInfo = require('../utility/platformInfo');
const connections = require('../controllers/connections');
const { getAuthProvider } = require('../auth/authProvider');

const lock = new AsyncLock();

module.exports = {
  // settingsValue: {},

  // async _init() {
  //   try {
  //     this.settingsValue = JSON.parse(await fs.readFile(path.join(datadir(), 'settings.json'), { encoding: 'utf-8' }));
  //   } catch (err) {
  //     this.settingsValue = {};
  //   }
  // },

  get_meta: true,
  async get(_params, req) {
    const authProvider = getAuthProvider();
    const login = authProvider.getCurrentLogin(req);
    const permissions = authProvider.getCurrentPermissions(req);
    const isLoginForm = authProvider.isLoginForm();
    const additionalConfigProps = authProvider.getAdditionalConfigProps();

    return {
      runAsPortal: !!connections.portalConnections,
      singleDbConnection: connections.singleDbConnection,
      singleConnection: connections.singleConnection,
      // hideAppEditor: !!process.env.HIDE_APP_EDITOR,
      allowShellConnection: platformInfo.allowShellConnection,
      allowShellScripting: platformInfo.allowShellScripting,
      isDocker: platformInfo.isDocker,
      permissions,
      login,
      ...additionalConfigProps,
      isLoginForm,
      isAdminLoginForm: !!(process.env.STORAGE_DATABASE && process.env.ADMIN_PASSWORD && !process.env.BASIC_AUTH),
      storageDatabase: process.env.STORAGE_DATABASE,
      logsFilePath: getLogsFilePath(),
      connectionsFilePath: path.join(datadir(), 'connections.jsonl'),
      ...currentVersion,
    };
  },

  logout_meta: {
    method: 'get',
    raw: true,
  },
  logout(req, res) {
    res.status(401).send('Logged out<br><a href="../..">Back to DbGate</a>');
  },

  platformInfo_meta: true,
  async platformInfo() {
    return platformInfo;
  },

  getSettings_meta: true,
  async getSettings() {
    const res = await lock.acquire('settings', async () => {
      return await this.loadSettings();
    });
    return res;
  },

  fillMissingSettings(value) {
    const res = {
      ...value,
    };
    if (value['app.useNativeMenu'] !== true && value['app.useNativeMenu'] !== false) {
      // res['app.useNativeMenu'] = os.platform() == 'darwin' ? true : false;
      res['app.useNativeMenu'] = false;
    }
    for (const envVar in process.env) {
      if (envVar.startsWith('SETTINGS_')) {
        const key = envVar.substring('SETTINGS_'.length);
        if (!res[key]) {
          res[key] = process.env[envVar];
        }
      }
    }
    return res;
  },

  async loadSettings() {
    try {
      const settingsText = await fs.readFile(path.join(datadir(), 'settings.json'), { encoding: 'utf-8' });
      return this.fillMissingSettings(JSON.parse(settingsText));
    } catch (err) {
      return this.fillMissingSettings({});
    }
  },

  updateSettings_meta: true,
  async updateSettings(values, req) {
    if (!hasPermission(`settings/change`, req)) return false;

    const res = await lock.acquire('settings', async () => {
      const currentValue = await this.loadSettings();
      try {
        const updated = {
          ...currentValue,
          ...values,
        };
        await fs.writeFile(path.join(datadir(), 'settings.json'), JSON.stringify(updated, undefined, 2));
        // this.settingsValue = updated;
        socket.emitChanged(`settings-changed`);
        return updated;
      } catch (err) {
        return false;
      }
    });
    return res;
  },

  changelog_meta: true,
  async changelog() {
    const resp = await axios.default.get('https://raw.githubusercontent.com/dbgate/dbgate/master/CHANGELOG.md');
    return resp.data;
  },
};
