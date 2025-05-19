const axios = require('axios');
const fs = require('fs-extra');
const _ = require('lodash');
const path = require('path');
const { getExternalParamsWithLicense } = require('./authProxy');
const { getLogger, extractErrorLogData, jsonLinesParse } = require('dbgate-tools');
const { datadir } = require('./directories');
const platformInfo = require('./platformInfo');
const connections = require('../controllers/connections');
const { isProApp } = require('./checkLicense');

const logger = getLogger('cloudIntf');
let cloudFiles = null;

const DBGATE_IDENTITY_URL = process.env.LOCAL_DBGATE_IDENTITY
  ? 'http://localhost:3103'
  : process.env.DEVWEB || process.env.DEVMODE
  ? 'https://identity.dbgate.udolni.net'
  : 'https://identity.dbgate.io';

const DBGATE_CLOUD_URL = process.env.LOCAL_DBGATE_CLOUD
  ? 'http://localhost:3109'
  : process.env.DEVWEB || process.env.DEVMODE
  ? 'https://cloud.dbgate.udolni.net'
  : 'https://cloud.dbgate.io';

async function createDbGateIdentitySession(client) {
  const resp = await axios.default.post(
    `${DBGATE_IDENTITY_URL}/api/create-session`,
    {
      client,
    },
    getExternalParamsWithLicense()
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
      const resp = await axios.default.get(
        `${DBGATE_IDENTITY_URL}/api/get-token/${sid}`,
        getExternalParamsWithLicense()
      );

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
    cloudFiles = parsedJson;
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
  const engines = await connections.getUsedEngines();
  const engineTags = engines.map(engine => engine.split('@')[0]);
  res.push(...engineTags);

  // team-premium and trials will return the same cloud files as premium - no need to check
  res.push(isProApp() ? 'premium' : 'community');

  return res;
}

async function updateCloudFiles() {
  let lastCloudFilesTags;
  try {
    const fileContent = await fs.readFile(path.join(datadir(), 'cloud-files-tags.json'), 'utf-8');
    cloudFiles = JSON.parse(fileContent);
  } catch (err) {
    lastCloudFilesTags = [];
  }

  let lastCheckedTm = 0;
  if (_.isEqual(cloudFiles, lastCloudFilesTags) && cloudFiles.length > 0) {
    lastCheckedTm = _.max(cloudFiles.map(x => x.modifiedTm));
  }
  const tags = await collectCloudFilesSearchTags();

  const resp = await axios.default.post(
    `${DBGATE_CLOUD_URL}/public-cloud-updates`,
    {
      lastCheckedTm,
      tags,
    },
    getExternalParamsWithLicense()
  );

  const filesByPath = _.keyBy(cloudFiles, 'path');
  for(const file of resp.data) {
    filesByPath[file.path] = file;
  }

  cloudFiles = Object.values(filesByPath);

  await fs.writeFile(
    path.join(datadir(), 'cloud-files.jsonl'),
    cloudFiles.map(x => JSON.stringify(x)).join('\n')
  );

  await fs.writeFile(
    path.join(datadir(), 'cloud-files-tags.json'),
    JSON.stringify(tags)
  );
}

async function startCloudFiles() {
  await loadCloudFiles();
  await updateCloudFiles();
}

module.exports = {
  createDbGateIdentitySession,
  startCloudTokenChecking,
  startCloudFiles,
};
