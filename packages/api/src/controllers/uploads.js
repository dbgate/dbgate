const path = require('path');
const { uploadsdir } = require('../utility/directories');
const uuidv1 = require('uuid/v1');
const { getLogger } = require('dbgate-tools');
const logger = getLogger();

module.exports = {
  upload_meta: {
    method: 'post',
    raw: true,
  },
  upload(req, res) {
    const { data } = req.files || {};
    if (!data) {
      res.json(null);
      return;
    }
    const uploadName = uuidv1();
    const filePath = path.join(uploadsdir(), uploadName);
    logger.info(`Uploading file ${data.name}, size=${data.size}`);

    data.mv(filePath, () => {
      res.json({
        originalName: data.name,
        uploadName,
        filePath,
      });
    });
  },

  get_meta: {
    method: 'get',
    raw: true,
  },
  get(req, res) {
    res.sendFile(path.join(uploadsdir(), req.query.file));
  },
};
