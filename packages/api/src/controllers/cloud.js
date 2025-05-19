const fs = require('fs-extra');
const _ = require('lodash');
const path = require('path');
const { appdir } = require('../utility/directories');
const socket = require('../utility/socket');
const connections = require('./connections');
const { getPublicCloudFiles } = require('../utility/cloudIntf');

module.exports = {
  publicFiles_meta: true,
  async publicFiles() {
    const res = await getPublicCloudFiles();
    return res;
  },
};
