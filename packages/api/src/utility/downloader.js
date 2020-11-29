const axios = require('axios');
const fs = require('fs');

function saveStreamToFile(pipedStream, fileName) {
  return new Promise((resolve, reject) => {
    const fileStream = fs.createWriteStream(fileName);
    fileStream.on('close', () => resolve());
    pipedStream.pipe(fileStream);
  });
}

async function downloadFile(url, file) {
  console.log(`Downloading ${url} into ${file}`);
  const tarballResp = await axios.default({
    method: 'get',
    url,
    responseType: 'stream',
  });
  await saveStreamToFile(tarballResp.data, file);
}

module.exports = {
  saveStreamToFile,
  downloadFile,
};
