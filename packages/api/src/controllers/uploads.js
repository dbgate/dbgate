const path = require('path');
const { uploadsdir } = require('../utility/directories');
const uuidv1 = require('uuid/v1');

// const extensions = [
//   {
//     ext: '.xlsx',
//     type: 'excel',
//   },
//   {
//     ext: '.jsonl',
//     type: 'jsonl',
//   },
//   {
//     ext: '.csv',
//     type: 'csv',
//   },
// ];

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
    // let storageType = null;
    // let shortName = data.name;
    // for (const { ext, type } of extensions) {
    //   if (data.name.endsWith(ext)) {
    //     storageType = type;
    //     shortName = data.name.slice(0, -ext.length);
    //   }
    // }
    data.mv(filePath, () => {
      res.json({
        originalName: data.name,
        // shortName,
        // storageType,
        uploadName,
        filePath,
      });
    });
  },
};
