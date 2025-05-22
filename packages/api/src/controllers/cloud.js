const {
  getPublicCloudFiles,
  getPublicFileData,
  refreshPublicFiles,
  callCloudApiGet,
  callCloudApiPost,
  getCloudFolderEncryptor,
  getCloudContent,
  putCloudContent,
} = require('../utility/cloudIntf');
const connections = require('./connections');
const socket = require('../utility/socket');
const { recryptConnection, getInternalEncryptor } = require('../utility/crypting');
const { getConnectionLabel, getLogger, extractErrorLogData } = require('dbgate-tools');
const logger = getLogger('cloud');
const _ = require('lodash');

module.exports = {
  publicFiles_meta: true,
  async publicFiles() {
    const res = await getPublicCloudFiles();
    return res;
  },

  publicFileData_meta: true,
  async publicFileData({ path }) {
    const res = getPublicFileData(path);
    return res;
  },

  refreshPublicFiles_meta: true,
  async refreshPublicFiles() {
    await refreshPublicFiles();
    return {
      status: 'ok',
    };
  },

  contentList_meta: true,
  async contentList() {
    try {
      const resp = await callCloudApiGet('content-list');
      return resp;
    } catch (err) {
      logger.error(extractErrorLogData(err), 'Error getting cloud content list');

      return [];
    }
  },

  getContent_meta: true,
  async getContent({ folid, cntid }) {
    const resp = await getCloudContent(folid, cntid);
    return resp;
  },

  putContent_meta: true,
  async putContent({ folid, cntid, content, name, type }) {
    putCloudContent(folid, cntid, content, name, type);
    socket.emitChanged('cloud-content-changed');
    return {
      status: 'ok',
    };
  },

  createFolder_meta: true,
  async createFolder({ name }) {
    await callCloudApiPost(`folders/create`, { name });
    socket.emitChanged('cloud-content-changed');
    return {
      status: 'ok',
    };
  },

  grantFolder_meta: true,
  async grantFolder({ inviteLink }) {
    const m = inviteLink.match(/^dbgate\:\/\/folder\/v1\/([a-zA-Z]+)\?mode=(read|write|admin)$/);
    const invite = m[1];
    const mode = m[2];

    await callCloudApiPost(`folders/grant/${mode}`, { invite });
    socket.emitChanged('cloud-content-changed');
    return {
      status: 'ok',
    };
  },

  refreshContent_meta: true,
  async refreshContent() {
    socket.emitChanged('cloud-content-changed');
    return {
      status: 'ok',
    };
  },

  moveConnectionCloud_meta: true,
  async moveConnectionCloud({ conid, folid }) {
    const conn = await connections.getCore({ conid });
    const folderEncryptor = getCloudFolderEncryptor(folid);
    const recryptedConn = recryptConnection(conn, getInternalEncryptor(), folderEncryptor);
    const connToSend = _.omit(recryptedConn, ['_id']);
    await this.putContent({
      folid,
      cntid: undefined,
      content: JSON.stringify(connToSend),
      name: getConnectionLabel(conn),
      type: 'connection',
    });
    return {
      status: 'ok',
    };
  },
};
