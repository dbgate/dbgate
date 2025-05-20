const { getPublicCloudFiles, getPublicFileData, refreshPublicFiles } = require('../utility/cloudIntf');

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
};
