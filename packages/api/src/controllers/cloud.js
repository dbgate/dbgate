const {
  getPublicCloudFiles,
  getPublicFileData,
  refreshPublicFiles,
  callCloudApiGet,
  callCloudApiPost,
} = require('../utility/cloudIntf');
const socket = require('../utility/socket');

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
    const resp = callCloudApiGet('content-list');
    console.log('contentList', resp);
    return resp;
  },

  getContent_meta: true,
  async getContent({ folid, cntid }) {
    const resp = await callCloudApiGet(`content/${folid}/${cntid}`);
    return resp;
  },

  putContent_meta: true,
  async putContent({ folid, cntid, content, name, type }) {
    await callCloudApiPost(`put-content`, { folid, cntid, content, name, type });
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
};
