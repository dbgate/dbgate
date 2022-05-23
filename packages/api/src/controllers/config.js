const fs = require('fs-extra');
const os = require('os');
const path = require('path');
const axios = require('axios');
const { datadir } = require('../utility/directories');
const { hasPermission, getLogins } = require('../utility/hasPermission');
const socket = require('../utility/socket');
const _ = require('lodash');
const AsyncLock = require('async-lock');

const currentVersion = require('../currentVersion');
const platformInfo = require('../utility/platformInfo');
const connections = require('../controllers/connections');

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
    const logins = getLogins();
    const login = logins ? logins.find(x => x.login == (req.auth && req.auth.user)) : null;
    const permissions = login ? login.permissions : null;

    return {
      runAsPortal: !!connections.portalConnections,
      singleDatabase: connections.singleDatabase,
      // hideAppEditor: !!process.env.HIDE_APP_EDITOR,
      allowShellConnection: platformInfo.allowShellConnection,
      allowShellScripting: platformInfo.allowShellConnection,
      isDocker: platformInfo.isDocker,
      permissions,
      login,
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
    try {
      return this.fillMissingSettings(
        JSON.parse(await fs.readFile(path.join(datadir(), 'settings.json'), { encoding: 'utf-8' }))
      );
    } catch (err) {
      return this.fillMissingSettings({});
    }
  },

  fillMissingSettings(value) {
    const res = {
      ...value,
    };
    if (value['app.useNativeMenu'] !== true && value['app.useNativeMenu'] !== false) {
      // res['app.useNativeMenu'] = os.platform() == 'darwin' ? true : false;
      res['app.useNativeMenu'] = false;
    }
    return res;
  },

  updateSettings_meta: true,
  async updateSettings(values, req) {
    if (!hasPermission(`settings/change`, req)) return false;

    const res = await lock.acquire('update', async () => {
      const currentValue = await this.getSettings();
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
