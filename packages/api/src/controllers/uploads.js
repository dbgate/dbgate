const path = require('path');
const { uploadsdir } = require('../utility/directories');
const uuidv1 = require('uuid/v1');

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
    console.log(`Uploading file ${data.name}, size=${data.size}`);

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
