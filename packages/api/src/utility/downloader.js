const axios = require('axios');
const fs = require('fs');
const { safeHttpAgent, safeHttpsAgent } = require('./safeHttpAgents');

// Optional, opt-in limits for hardened (safeRemoteFetch) downloads. Left unset by
// default so that legitimate imports of large files are not regressed.
const safeFetchTimeout = parseInt(process.env.EXTERNAL_FETCH_TIMEOUT_MS, 10) || 0;
const safeFetchMaxBytes = parseInt(process.env.EXTERNAL_FETCH_MAX_BYTES, 10) || 0;

function saveStreamToFile(pipedStream, fileName, maxBytes = 0) {
  return new Promise((resolve, reject) => {
    const fileStream = fs.createWriteStream(fileName);
    let written = 0;
    fileStream.on('close', () => resolve());
    fileStream.on('error', reject);
    pipedStream.on('error', reject);
    if (maxBytes > 0) {
      pipedStream.on('data', chunk => {
        written += chunk.length;
        if (written > maxBytes) {
          pipedStream.destroy(new Error('DBGM-00338 Downloaded file exceeds the maximum allowed size'));
          fileStream.destroy();
        }
      });
    }
    pipedStream.pipe(fileStream);
  });
}

async function downloadFile(url, file, options = {}) {
  console.log(`Downloading ${url} into ${file}`);
  const axiosOptions = {
    method: 'get',
    url,
    responseType: 'stream',
  };
  let maxBytes = 0;
  // safeRemoteFetch is used when the URL originates from a network-exposed,
  // user-controlled request. It restricts the connection to public hosts and
  // bounds the number of redirects.
  if (options.safeRemoteFetch) {
    axiosOptions.httpAgent = safeHttpAgent;
    axiosOptions.httpsAgent = safeHttpsAgent;
    axiosOptions.maxRedirects = 5;
    // Do not route through an environment proxy (HTTP_PROXY/HTTPS_PROXY): a proxy
    // would terminate the validated connection and fetch the real target itself,
    // bypassing the per-connection address checks above.
    axiosOptions.proxy = false;
    if (safeFetchTimeout > 0) {
      axiosOptions.timeout = safeFetchTimeout;
    }
    maxBytes = safeFetchMaxBytes;
  }
  const tarballResp = await axios.default(axiosOptions);
  await saveStreamToFile(tarballResp.data, file, maxBytes);
}

module.exports = {
  saveStreamToFile,
  downloadFile,
};
