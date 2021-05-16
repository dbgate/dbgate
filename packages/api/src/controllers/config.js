const fs = require('fs-extra');
const path = require('path');
const { datadir } = require('../utility/directories');
const hasPermission = require('../utility/hasPermission');
const socket = require('../utility/socket');
const _ = require('lodash');

const currentVersion = require('../currentVersion');
const platformInfo = require('../utility/platformInfo');
const connections = require('../controllers/connections');

module.exports = {
  settingsValue: {},

  async _init() {
    try {
      this.settingsValue = JSON.parse(await fs.readFile(path.join(datadir(), 'settings.json'), { encoding: 'utf-8' }));
    } catch (err) {
      this.settingsValue = {};
    }
  },

  get_meta: 'get',
  async get() {
    const permissions = process.env.PERMISSIONS ? process.env.PERMISSIONS.split(',') : null;

    return {
      runAsPortal: !!connections.portalConnections,
      singleDatabase: connections.singleDatabase,
      permissions,
      ...currentVersion,
    };
  },

  platformInfo_meta: 'get',
  async platformInfo() {
    return platformInfo;
  },

  getSettings_meta: 'get',
  async getSettings() {
    return this.settingsValue;
  },

  updateSettings_meta: 'post',
  async updateSettings(values) {
    if (!hasPermission(`settings/change`)) return false;
    try {
      const updated = {
        ...this.settingsValue,
        ...values,
      };
      await fs.writeFile(path.join(datadir(), 'settings.json'), JSON.stringify(updated, undefined, 2));
      this.settingsValue = updated;
      socket.emitChanged(`settings-changed`);
      return updated;
    } catch (err) {
      return false;
    }
  },
};
