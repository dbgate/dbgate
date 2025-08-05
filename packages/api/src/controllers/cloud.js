const {
  getPublicCloudFiles,
  getPublicFileData,
  refreshPublicFiles,
  callCloudApiGet,
  callCloudApiPost,
  getCloudFolderEncryptor,
  getCloudContent,
  putCloudContent,
  removeCloudCachedConnection,
} = require('../utility/cloudIntf');
const connections = require('./connections');
const socket = require('../utility/socket');
const { recryptConnection, getInternalEncryptor, encryptConnection } = require('../utility/crypting');
const { getConnectionLabel, getLogger, extractErrorLogData } = require('dbgate-tools');
const logger = getLogger('cloud');
const _ = require('lodash');
const fs = require('fs-extra');
const { getAiGatewayServer } = require('../utility/authProxy');

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
      logger.error(extractErrorLogData(err), 'DBGM-00099 Error getting cloud content list');

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
    const resp = await putCloudContent(folid, cntid, content, name, type, {});
    socket.emitChanged('cloud-content-changed');
    socket.emit('cloud-content-updated');
    return resp;
  },

  createFolder_meta: true,
  async createFolder({ name }) {
    const resp = await callCloudApiPost(`folders/create`, { name });
    socket.emitChanged('cloud-content-changed');
    socket.emit('cloud-content-updated');
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
    socket.emit('cloud-content-updated');
    return resp;
  },

  renameFolder_meta: true,
  async renameFolder({ folid, name }) {
    const resp = await callCloudApiPost(`folders/rename`, { folid, name });
    socket.emitChanged('cloud-content-changed');
    socket.emit('cloud-content-updated');
    return resp;
  },

  deleteFolder_meta: true,
  async deleteFolder({ folid }) {
    const resp = await callCloudApiPost(`folders/delete`, { folid });
    socket.emitChanged('cloud-content-changed');
    socket.emit('cloud-content-updated');
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
    socket.emit('cloud-content-updated');
    return {
      status: 'ok',
    };
  },

  copyConnectionCloud_meta: true,
  async copyConnectionCloud({ conid, folid }) {
    const conn = await connections.getCore({ conid });
    const folderEncryptor = await getCloudFolderEncryptor(folid);
    const recryptedConn = recryptConnection(conn, getInternalEncryptor(), folderEncryptor);
    const connToSend = _.omit(recryptedConn, ['_id']);
    const resp = await putCloudContent(
      folid,
      undefined,
      JSON.stringify(connToSend),
      getConnectionLabel(conn),
      'connection',
      {
        connectionColor: conn.connectionColor,
        connectionEngine: conn.engine,
      }
    );
    return resp;
  },

  saveConnection_meta: true,
  async saveConnection({ folid, connection }) {
    let cntid = undefined;
    if (connection._id) {
      const m = connection._id.match(/^cloud\:\/\/(.+)\/(.+)$/);
      if (!m) {
        throw new Error('Invalid cloud connection ID format');
      }
      folid = m[1];
      cntid = m[2];
    }

    if (!folid) {
      throw new Error('Missing cloud folder ID');
    }

    const folderEncryptor = await getCloudFolderEncryptor(folid);
    const recryptedConn = encryptConnection(connection, folderEncryptor);
    const resp = await putCloudContent(
      folid,
      cntid,
      JSON.stringify(recryptedConn),
      getConnectionLabel(recryptedConn),
      'connection',
      {
        connectionColor: connection.connectionColor,
        connectionEngine: connection.engine,
      }
    );

    if (resp.apiErrorMessage) {
      return resp;
    }

    removeCloudCachedConnection(folid, resp.cntid);
    cntid = resp.cntid;
    socket.emitChanged('cloud-content-changed');
    socket.emit('cloud-content-updated');
    return {
      ...recryptedConn,
      _id: `cloud://${folid}/${cntid}`,
    };
  },

  duplicateConnection_meta: true,
  async duplicateConnection({ conid }) {
    const m = conid.match(/^cloud\:\/\/(.+)\/(.+)$/);
    if (!m) {
      throw new Error('Invalid cloud connection ID format');
    }
    const folid = m[1];
    const cntid = m[2];
    const respGet = await getCloudContent(folid, cntid);
    const conn = JSON.parse(respGet.content);
    const conn2 = {
      ...conn,
      displayName: getConnectionLabel(conn) + ' - copy',
    };
    const respPut = await putCloudContent(folid, undefined, JSON.stringify(conn2), conn2.displayName, 'connection', {
      connectionColor: conn.connectionColor,
      connectionEngine: conn.engine,
    });
    return respPut;
  },

  deleteConnection_meta: true,
  async deleteConnection({ conid }) {
    const m = conid.match(/^cloud\:\/\/(.+)\/(.+)$/);
    if (!m) {
      throw new Error('Invalid cloud connection ID format');
    }
    const folid = m[1];
    const cntid = m[2];
    const resp = await callCloudApiPost(`content/delete/${folid}/${cntid}`);
    socket.emitChanged('cloud-content-changed');
    socket.emit('cloud-content-updated');
    return resp;
  },

  deleteContent_meta: true,
  async deleteContent({ folid, cntid }) {
    const resp = await callCloudApiPost(`content/delete/${folid}/${cntid}`);
    socket.emitChanged('cloud-content-changed');
    socket.emit('cloud-content-updated');
    return resp;
  },

  renameContent_meta: true,
  async renameContent({ folid, cntid, name }) {
    const resp = await callCloudApiPost(`content/rename/${folid}/${cntid}`, { name });
    socket.emitChanged('cloud-content-changed');
    socket.emit('cloud-content-updated');
    return resp;
  },

  saveFile_meta: true,
  async saveFile({ folid, cntid, fileName, data, contentFolder, format }) {
    const resp = await putCloudContent(folid, cntid, data, fileName, 'file', { contentFolder, contentType: format });
    socket.emitChanged('cloud-content-changed');
    socket.emit('cloud-content-updated');
    return resp;
  },

  copyFile_meta: true,
  async copyFile({ folid, cntid, name }) {
    const resp = await callCloudApiPost(`content/duplicate/${folid}/${cntid}`, { name });
    socket.emitChanged('cloud-content-changed');
    socket.emit('cloud-content-updated');
    return resp;
  },

  exportFile_meta: true,
  async exportFile({ folid, cntid, filePath }, req) {
    const { content } = await getCloudContent(folid, cntid);
    if (!content) {
      throw new Error('File not found');
    }
    await fs.writeFile(filePath, content);
    return true;
  },

  folderUsers_meta: true,
  async folderUsers({ folid }) {
    const resp = await callCloudApiGet(`content-folders/users/${folid}`);
    return resp;
  },

  setFolderUserRole_meta: true,
  async setFolderUserRole({ folid, email, role }) {
    const resp = await callCloudApiPost(`content-folders/set-user-role/${folid}`, { email, role });
    return resp;
  },

  removeFolderUser_meta: true,
  async removeFolderUser({ folid, email }) {
    const resp = await callCloudApiPost(`content-folders/remove-user/${folid}`, { email });
    return resp;
  },

  getAiGateway_meta: true,
  async getAiGateway() {
    return getAiGatewayServer();
  },

  // chatStream_meta: {
  //   raw: true,
  //   method: 'post',
  // },
  // chatStream(req, res) {
  //   callChatStream(req.body, res);
  // },
};
