const axios = require('axios');
const crypto = require('crypto');
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
const currentVersion = require('../currentVersion');
const { getPublicIpInfo } = require('./hardwareFingerprint');

const logger = getLogger('cloudIntf');

let cloudFiles = null;

const DBGATE_IDENTITY_URL = process.env.LOCAL_DBGATE_IDENTITY
  ? 'http://localhost:3103'
  : process.env.PROD_DBGATE_IDENTITY
  ? 'https://identity.dbgate.io'
  : process.env.DEVWEB || process.env.DEVMODE
  ? 'https://identity.dbgate.udolni.net'
  : 'https://identity.dbgate.io';

const DBGATE_CLOUD_URL = process.env.LOCAL_DBGATE_CLOUD
  ? 'http://localhost:3110'
  : process.env.PROD_DBGATE_CLOUD
  ? 'https://cloud.dbgate.io'
  : process.env.DEVWEB || process.env.DEVMODE
  ? 'https://cloud.dbgate.udolni.net'
  : 'https://cloud.dbgate.io';

async function createDbGateIdentitySession(client, redirectUri) {
  const resp = await axios.default.post(
    `${DBGATE_IDENTITY_URL}/api/create-session`,
    {
      client,
      redirectUri,
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
      // console.log(`Checking cloud token for session: ${DBGATE_IDENTITY_URL}/api/get-token/${sid}`);
      const resp = await axios.default.get(`${DBGATE_IDENTITY_URL}/api/get-token/${sid}`, {
        headers: {
          ...getLicenseHttpHeaders(),
        },
      });
      // console.log('CHECK RESP:', resp.data);

      if (resp.data?.email) {
        clearInterval(interval);
        callback(resp.data);
      }
    } catch (err) {
      logger.error(extractErrorLogData(err), 'DBGM-00164 Error checking cloud token');
    }
  }, 500);
}

async function readCloudTokenHolder(sid) {
  const resp = await axios.default.get(`${DBGATE_IDENTITY_URL}/api/get-token/${sid}`, {
    headers: {
      ...getLicenseHttpHeaders(),
    },
  });
  if (resp.data?.email) {
    return resp.data;
  }
  return null;
}

async function readCloudTestTokenHolder(email) {
  const resp = await axios.default.post(
    `${DBGATE_IDENTITY_URL}/api/test-token`,
    { email },
    {
      headers: {
        ...getLicenseHttpHeaders(),
      },
    }
  );
  if (resp.data?.email) {
    return resp.data;
  }
  return null;
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

async function getCloudUsedEngines() {
  try {
    const resp = await callCloudApiGet('content-engines');
    return resp || [];
  } catch (err) {
    logger.error(extractErrorLogData(err), 'DBGM-00165 Error getting cloud content list');
    return [];
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
  const cloudEngines = await getCloudUsedEngines();
  const cloudEngineTags = cloudEngines.map(engine => engine.split('@')[0]);
  res.push(...cloudEngineTags);

  // team-premium and trials will return the same cloud files as premium - no need to check
  res.push(isProApp() ? 'premium' : 'community');

  return _.uniq(res);
}

async function getCloudSigninHolder() {
  const settingsValue = await config.getSettings();
  const holder = settingsValue['cloudSigninTokenHolder'];
  return holder;
}

async function getCloudSigninHeaders(holder = null) {
  if (!holder) {
    holder = await getCloudSigninHolder();
  }
  if (holder) {
    return {
      'x-cloud-login': holder.token,
    };
  }
  return null;
}

async function updateCloudFiles(isRefresh) {
  let lastCloudFilesTags;
  try {
    lastCloudFilesTags = await fs.readFile(path.join(datadir(), 'cloud-files-tags.txt'), 'utf-8');
  } catch (err) {
    lastCloudFilesTags = '';
  }

  const ipInfo = await getPublicIpInfo();

  const tags = (await collectCloudFilesSearchTags()).join(',');
  let lastCheckedTm = 0;
  if (tags == lastCloudFilesTags && cloudFiles.length > 0) {
    lastCheckedTm = _.max(cloudFiles.map(x => parseInt(x.modifiedTm)));
  }

  logger.info({ tags, lastCheckedTm }, 'DBGM-00082 Downloading cloud files');

  const resp = await axios.default.get(
    `${DBGATE_CLOUD_URL}/public-cloud-updates?lastCheckedTm=${lastCheckedTm}&tags=${tags}&isRefresh=${
      isRefresh ? 1 : 0
    }&country=${ipInfo?.country || ''}`,
    {
      headers: {
        ...getLicenseHttpHeaders(),
        ...(await getCloudInstanceHeaders()),
        'x-app-version': currentVersion.version,
      },
    }
  );

  logger.info(`DBGM-00083 Downloaded ${resp.data.length} cloud files`);

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
  loadCloudFiles();
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

async function refreshPublicFiles(isRefresh) {
  if (!cloudFiles) {
    await loadCloudFiles();
  }
  try {
    await updateCloudFiles(isRefresh);
  } catch (err) {
    logger.error(extractErrorLogData(err), 'DBGM-00166 Error updating cloud files');
  }
}

async function callCloudApiGet(endpoint, signinHolder = null, additionalHeaders = {}) {
  if (!signinHolder) {
    signinHolder = await getCloudSigninHolder();
  }
  if (!signinHolder) {
    return null;
  }
  const signinHeaders = await getCloudSigninHeaders(signinHolder);

  const resp = await axios.default.get(`${DBGATE_CLOUD_URL}/${endpoint}`, {
    headers: {
      ...getLicenseHttpHeaders(),
      ...signinHeaders,
      ...additionalHeaders,
    },
    validateStatus: status => status < 500,
  });
  const { errorMessage, isLicenseLimit, limitedLicenseLimits } = resp.data;
  if (errorMessage) {
    return {
      apiErrorMessage: errorMessage,
      apiErrorIsLicenseLimit: isLicenseLimit,
      apiErrorLimitedLicenseLimits: limitedLicenseLimits,
    };
  }
  return resp.data;
}

async function getCloudInstanceHeaders() {
  if (!(await fs.exists(path.join(datadir(), 'cloud-instance.txt')))) {
    const newInstanceId = crypto.randomUUID();
    await fs.writeFile(path.join(datadir(), 'cloud-instance.txt'), newInstanceId);
  }
  const instanceId = await fs.readFile(path.join(datadir(), 'cloud-instance.txt'), 'utf-8');
  return {
    'x-cloud-instance': instanceId,
  };
}

async function callCloudApiPost(endpoint, body, signinHolder = null) {
  if (!signinHolder) {
    signinHolder = await getCloudSigninHolder();
  }
  if (!signinHolder) {
    return null;
  }
  const signinHeaders = await getCloudSigninHeaders(signinHolder);

  const resp = await axios.default.post(`${DBGATE_CLOUD_URL}/${endpoint}`, body, {
    headers: {
      ...getLicenseHttpHeaders(),
      ...signinHeaders,
    },
    validateStatus: status => status < 500,
  });
  const { errorMessage, isLicenseLimit, limitedLicenseLimits } = resp.data;
  if (errorMessage) {
    return {
      apiErrorMessage: errorMessage,
      apiErrorIsLicenseLimit: isLicenseLimit,
      apiErrorLimitedLicenseLimits: limitedLicenseLimits,
    };
  }
  return resp.data;
}

async function getCloudFolderEncryptor(folid) {
  const { encryptionKey } = await callCloudApiGet(`folder-key/${folid}`);
  if (!encryptionKey) {
    throw new Error('No encryption key for folder: ' + folid);
  }
  return simpleEncryptor.createEncryptor(encryptionKey);
}

async function getCloudContent(folid, cntid) {
  const signinHolder = await getCloudSigninHolder();
  if (!signinHolder) {
    throw new Error('No signed in');
  }

  const encryptor = simpleEncryptor.createEncryptor(signinHolder.encryptionKey);

  const { content, name, type, contentAttributes, apiErrorMessage } = await callCloudApiGet(
    `content/${folid}/${cntid}`,
    signinHolder,
    {
      'x-kehid': signinHolder.kehid,
    }
  );

  if (apiErrorMessage) {
    return { apiErrorMessage };
  }

  return {
    content: encryptor.decrypt(content),
    name,
    type,
    contentAttributes,
  };
}

/**
 *
 * @returns Promise<{ cntid: string } | { apiErrorMessage: string }>
 */
async function putCloudContent(folid, cntid, content, name, type, contentAttributes) {
  const signinHolder = await getCloudSigninHolder();
  if (!signinHolder) {
    throw new Error('No signed in');
  }

  const encryptor = simpleEncryptor.createEncryptor(signinHolder.encryptionKey);

  const resp = await callCloudApiPost(
    `put-content`,
    {
      folid,
      cntid,
      name,
      type,
      kehid: signinHolder.kehid,
      content: encryptor.encrypt(content),
      contentAttributes,
    },
    signinHolder
  );
  socket.emitChanged('cloud-content-changed');
  socket.emit('cloud-content-updated');
  return resp;
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

function removeCloudCachedConnection(folid, cntid) {
  const cacheKey = `${folid}|${cntid}`;
  delete cloudConnectionCache[cacheKey];
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
  putCloudContent,
  removeCloudCachedConnection,
  readCloudTokenHolder,
  readCloudTestTokenHolder,
};
