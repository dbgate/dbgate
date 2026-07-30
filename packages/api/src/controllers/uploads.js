const crypto = require('crypto');
const path = require('path');
const fs = require('fs/promises');
const { uploadsdir } = require('../utility/directories');
const { extractErrorLogData, getLogger } = require('dbgate-tools');
const logger = getLogger('uploads');

module.exports = {
  upload_meta: {
    method: 'post',
    raw: true,
  },
  async upload(req, res) {
    const { data } = req.files || {};
    if (!data) {
      res.json(null);
      return;
    }
    if (data.truncated) {
      if (data.tempFilePath) {
        await fs.unlink(data.tempFilePath).catch(() => {});
      }
      res.status(413).json({
        message: 'DBGM-00000 Uploaded file was truncated before it reached DbGate',
      });
      return;
    }

    const uploadName = crypto.randomUUID();
    const filePath = path.join(uploadsdir(), uploadName);
    logger.info(`DBGM-00025 Uploading file ${data.name}, size=${data.size}`);

    try {
      await data.mv(filePath);
      const uploadedFile = await fs.stat(filePath);
      if (uploadedFile.size != data.size) {
        await fs.unlink(filePath).catch(() => {});
        res.status(400).json({
          message: `DBGM-00000 Uploaded file size mismatch: expected ${data.size} bytes, stored ${uploadedFile.size} bytes`,
        });
        return;
      }

      res.json({
        originalName: data.name,
        uploadName,
        filePath,
      });
    } catch (error) {
      await fs.unlink(filePath).catch(() => {});
      logger.error(extractErrorLogData(error), 'DBGM-00000 Error storing uploaded file');
      res.status(500).json({
        message: 'DBGM-00000 Error storing uploaded file',
      });
    }
  },

  get_meta: {
    method: 'get',
    raw: true,
  },
  get(req, res) {
    if (req.query.file.includes('..') || req.query.file.includes('/') || req.query.file.includes('\\')) {
      res.status(400).send('Invalid file path');
      return;
    }
    res.sendFile(path.join(uploadsdir(), req.query.file));
  },

//   uploadErrorToGist_meta: true,
//   async uploadErrorToGist() {
//     const logs = await fs.readFile(getLogsFilePath(), { encoding: 'utf-8' });
//     const connections = await serverConnections.getOpenedConnectionReport();
//     try {
//       const response = await axios.default.post(
//         'https://api.github.com/gists',
//         {
//           description: `DbGate ${currentVersion.version} error report`,
//           public: false,
//           files: {
//             'logs.jsonl': {
//               content: logs,
//             },
//             'os.json': {
//               content: JSON.stringify(
//                 {
//                   release: os.release(),
//                   arch: os.arch(),
//                   machine: os.machine(),
//                   platform: os.platform(),
//                   type: os.type(),
//                 },
//                 null,
//                 2
//               ),
//             },
//             'platform.json': {
//               content: JSON.stringify(
//                 _.omit(
//                   {
//                     ...platformInfo,
//                   },
//                   ['defaultKeyfile', 'sshAuthSock']
//                 ),
//                 null,
//                 2
//               ),
//             },
//             'connections.json': {
//               content: JSON.stringify(connections, null, 2),
//             },
//             'version.json': {
//               content: JSON.stringify(currentVersion, null, 2),
//             },
//           },
//         },
//         {
//           headers: {
//             Authorization: `token ${await this.getGistToken()}`,
//             'Content-Type': 'application/json',
//             Accept: 'application/vnd.github.v3+json',
//           },
//         }
//       );

//       return response.data;
//     } catch (err) {
//       logger.error(extractErrorLogData(err), 'DBGM-00148 Error uploading gist');

//       return {
//         apiErrorMessage: err.message,
//       };
//       // console.error('Error creating gist:', error.response ? error.response.data : error.message);
//     }
//   },
};
