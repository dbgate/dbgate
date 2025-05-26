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
  async refreshPublicFiles({ isRefresh }) {
    await refreshPublicFiles(isRefresh);
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
    const resp = await putCloudContent(folid, cntid, content, name, type);
    socket.emitChanged('cloud-content-changed');
    return resp;
  },

  createFolder_meta: true,
  async createFolder({ name }) {
    const resp = await callCloudApiPost(`folders/create`, { name });
    socket.emitChanged('cloud-content-changed');
    return resp;
  },

  grantFolder_meta: true,
  async grantFolder({ inviteLink }) {
    const m = inviteLink.match(/^dbgate\:\/\/folder\/v1\/([a-zA-Z0-9]+)\?mode=(read|write|admin)$/);
    if (!m) {
      throw new Error('Invalid invite link format');
    }
    const invite = m[1];
    const mode = m[2];

    const resp = await callCloudApiPost(`folders/grant/${mode}`, { invite });
    socket.emitChanged('cloud-content-changed');
    return resp;
  },

  renameFolder_meta: true,
  async renameFolder({ folid, name }) {
    const resp = await callCloudApiPost(`folders/rename`, { folid, name });
    socket.emitChanged('cloud-content-changed');
    return resp;
  },

  deleteFolder_meta: true,
  async deleteFolder({ folid }) {
    const resp = await callCloudApiPost(`folders/delete`, { folid });
    socket.emitChanged('cloud-content-changed');
    return resp;
  },

  getInviteToken_meta: true,
  async getInviteToken({ folid, role }) {
    const resp = await callCloudApiGet(`invite-token/${folid}/${role}`);
    return resp;
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
    const resp = await putCloudContent(
      folid,
      undefined,
      JSON.stringify(connToSend),
      getConnectionLabel(conn),
      'connection'
    );
    return resp;
  },
};
