const fs = require('fs-extra');
const path = require('path');
const { datadir } = require('../utility/directories');
const hasPermission = require('../utility/hasPermission');
const socket = require('../utility/socket');
const _ = require('lodash');

const currentVersion = require('../currentVersion');
const platformInfo = require('../utility/platformInfo');

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
    // const toolbarButtons = process.env.TOOLBAR;
    // const toolbar = toolbarButtons
    //   ? toolbarButtons.split(',').map((name) => ({
    //       name,
    //       icon: process.env[`ICON_${name}`],
    //       title: process.env[`TITLE_${name}`],
    //       page: process.env[`PAGE_${name}`],
    //     }))
    //   : null;
    // const startupPages = process.env.STARTUP_PAGES ? process.env.STARTUP_PAGES.split(',') : [];
    const permissions = process.env.PERMISSIONS ? process.env.PERMISSIONS.split(',') : null;
    const singleDatabase =
      process.env.SINGLE_CONNECTION && process.env.SINGLE_DATABASE
        ? {
            conid: process.env.SINGLE_CONNECTION,
            database: process.env.SINGLE_DATABASE,
          }
        : null;

    return {
      runAsPortal: !!process.env.CONNECTIONS,
      // toolbar,
      // startupPages,
      singleDatabase,
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
