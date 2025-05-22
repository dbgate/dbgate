const axios = require('axios');
const fs = require('fs-extra');
const _ = require('lodash');
const path = require('path');
const { getLicenseHttpHeaders } = require('./authProxy');
const { getLogger, extractErrorLogData, jsonLinesParse } = require('dbgate-tools');
const { datadir } = require('./directories');
const platformInfo = require('./platformInfo');
const connections = require('../controllers/connections');
const { isProApp } = require('./checkLicense');
const socket = require('./socket');
const config = require('../controllers/config');
const simpleEncryptor = require('simple-encryptor');

const logger = getLogger('cloudIntf');

let cloudFiles = null;

const DBGATE_IDENTITY_URL = process.env.LOCAL_DBGATE_IDENTITY
  ? 'http://localhost:3103'
  : process.env.DEVWEB || process.env.DEVMODE
  ? 'https://identity.dbgate.udolni.net'
  : 'https://identity.dbgate.io';

const DBGATE_CLOUD_URL = process.env.LOCAL_DBGATE_CLOUD
  ? 'http://localhost:3110'
  : process.env.DEVWEB || process.env.DEVMODE
  ? 'https://cloud.dbgate.udolni.net'
  : 'https://cloud.dbgate.io';

async function createDbGateIdentitySession(client) {
  const resp = await axios.default.post(
    `${DBGATE_IDENTITY_URL}/api/create-session`,
    {
      client,
    },
    {
      headers: {
        ...getLicenseHttpHeaders(),
        'Content-Type': 'application/json',
      },
    }
  );
  return {
    sid: resp.data.sid,
    url: `${DBGATE_IDENTITY_URL}/api/signin/${resp.data.sid}`,
  };
}

function startCloudTokenChecking(sid, callback) {
  const started = Date.now();
  const interval = setInterval(async () => {
    if (Date.now() - started > 60 * 1000) {
      clearInterval(interval);
      return;
    }

    try {
      const resp = await axios.default.get(`${DBGATE_IDENTITY_URL}/api/get-token/${sid}`, {
        headers: {
          ...getLicenseHttpHeaders(),
        },
      });

      if (resp.data.status == 'ok') {
        clearInterval(interval);
        callback(resp.data.token);
      }
    } catch (err) {
      logger.error(extractErrorLogData(err), 'Error checking cloud token');
    }
  }, 500);
}

async function loadCloudFiles() {
  try {
    const fileContent = await fs.readFile(path.join(datadir(), 'cloud-files.jsonl'), 'utf-8');
    const parsedJson = jsonLinesParse(fileContent);
    cloudFiles = _.sortBy(parsedJson, x => `${x.folder}/${x.title}`);
  } catch (err) {
    cloudFiles = [];
  }
}

async function collectCloudFilesSearchTags() {
  const res = [];
  if (platformInfo.isElectron) {
    res.push('app');
  } else {
    res.push('web');
  }
  if (platformInfo.isWindows) {
    res.push('windows');
  }
  if (platformInfo.isMac) {
    res.push('mac');
  }
  if (platformInfo.isLinux) {
    res.push('linux');
  }
  if (platformInfo.isAwsUbuntuLayout) {
    res.push('aws');
  }
  if (platformInfo.isAzureUbuntuLayout) {
    res.push('azure');
  }
  if (platformInfo.isSnap) {
    res.push('snap');
  }
  if (platformInfo.isDocker) {
    res.push('docker');
  }
  if (platformInfo.isNpmDist) {
    res.push('npm');
  }
  const engines = await connections.getUsedEngines();
  const engineTags = engines.map(engine => engine.split('@')[0]);
  res.push(...engineTags);

  // team-premium and trials will return the same cloud files as premium - no need to check
  res.push(isProApp() ? 'premium' : 'community');

  return res;
}

async function getCloudSigninHeaders() {
  const settingsValue = await config.getSettings();
  const value = settingsValue['cloudSigninToken'];
  if (value) {
    return {
      'x-cloud-login': value,
    };
  }
  return null;
}

async function updateCloudFiles() {
  let lastCloudFilesTags;
  try {
    lastCloudFilesTags = await fs.readFile(path.join(datadir(), 'cloud-files-tags.txt'), 'utf-8');
  } catch (err) {
    lastCloudFilesTags = '';
  }

  const tags = (await collectCloudFilesSearchTags()).join(',');
  let lastCheckedTm = 0;
  if (tags == lastCloudFilesTags && cloudFiles.length > 0) {
    lastCheckedTm = _.max(cloudFiles.map(x => parseInt(x.modifiedTm)));
  }

  logger.info({ tags, lastCheckedTm }, 'Downloading cloud files');

  const resp = await axios.default.get(
    `${DBGATE_CLOUD_URL}/public-cloud-updates?lastCheckedTm=${lastCheckedTm}&tags=${tags}`,
    {
      headers: {
        ...getLicenseHttpHeaders(),
        ...(await getCloudSigninHeaders()),
      },
    }
  );

  logger.info(`Downloaded ${resp.data.length} cloud files`);

  const filesByPath = lastCheckedTm == 0 ? {} : _.keyBy(cloudFiles, 'path');
  for (const file of resp.data) {
    if (file.isDeleted) {
      delete filesByPath[file.path];
    } else {
      filesByPath[file.path] = file;
    }
  }

  cloudFiles = Object.values(filesByPath);

  await fs.writeFile(path.join(datadir(), 'cloud-files.jsonl'), cloudFiles.map(x => JSON.stringify(x)).join('\n'));
  await fs.writeFile(path.join(datadir(), 'cloud-files-tags.txt'), tags);

  socket.emitChanged(`public-cloud-changed`);
}

async function startCloudFiles() {
  refreshPublicFiles();
}

async function getPublicCloudFiles() {
  if (!loadCloudFiles) {
    await loadCloudFiles();
  }
  return cloudFiles;
}

async function getPublicFileData(path) {
  const resp = await axios.default.get(`${DBGATE_CLOUD_URL}/public/${path}`, {
    headers: {
      ...getLicenseHttpHeaders(),
    },
  });
  return resp.data;
}

async function refreshPublicFiles() {
  if (!cloudFiles) {
    await loadCloudFiles();
  }
  try {
    await updateCloudFiles();
  } catch (err) {
    logger.error(extractErrorLogData(err), 'Error updating cloud files');
  }
}

async function callCloudApiGet(endpoint) {
  const signinHeaders = await getCloudSigninHeaders();
  if (!signinHeaders) {
    return null;
  }

  const resp = await axios.default.get(`${DBGATE_CLOUD_URL}/${endpoint}`, {
    headers: {
      ...getLicenseHttpHeaders(),
      ...signinHeaders,
    },
  });
  return resp.data;
}

async function callCloudApiPost(endpoint, body) {
  const signinHeaders = await getCloudSigninHeaders();
  if (!signinHeaders) {
    return null;
  }

  const resp = await axios.default.post(`${DBGATE_CLOUD_URL}/${endpoint}`, body, {
    headers: {
      ...getLicenseHttpHeaders(),
      ...signinHeaders,
    },
  });
  return resp.data;
}

async function getCloudFolderEncryptor(folid) {
  const { encryptionKey } = await callCloudApiGet(`folder-key/${folid}`);
  if (!encryptionKey) {
    throw new Error('No encryption key');
  }
  return simpleEncryptor.createEncryptor(encryptionKey);
}

async function getCloudContent(folid, cntid) {
  const { content, name, type } = await callCloudApiGet(`content/${folid}/${cntid}`);
  return { content, name, type };
}

const cloudConnectionCache = {};
async function loadCachedCloudConnection(folid, cntid) {
  const cacheKey = `${folid}|${cntid}`;
  if (!cloudConnectionCache[cacheKey]) {
    const { content } = await getCloudContent(folid, cntid);
    cloudConnectionCache[cacheKey] = {
      ...JSON.parse(content),
      _id: `cloud://${folid}/${cntid}`,
    };
  }
  return cloudConnectionCache[cacheKey];
}

module.exports = {
  createDbGateIdentitySession,
  startCloudTokenChecking,
  startCloudFiles,
  getPublicCloudFiles,
  getPublicFileData,
  refreshPublicFiles,
  callCloudApiGet,
  callCloudApiPost,
  getCloudFolderEncryptor,
  getCloudContent,
  loadCachedCloudConnection,
};
