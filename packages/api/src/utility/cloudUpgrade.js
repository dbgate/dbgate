const axios = require('axios');
const fs = require('fs');
const fsp = require('fs/promises');
const semver = require('semver');
const currentVersion = require('../currentVersion');
const { getLogger, extractErrorLogData } = require('dbgate-tools');

const logger = getLogger('cloudUpgrade');

async function checkCloudUpgrade() {
  try {
    const resp = await axios.default.get('https://api.github.com/repos/dbgate/dbgate/releases/latest');
    const json = resp.data;
    const version = json.name.substring(1);
    let cloudDownloadedVersion = null;
    try {
      cloudDownloadedVersion = await fsp.readFile(process.env.CLOUD_UPGRADE_FILE + '.version', 'utf-8');
    } catch (err) {
      cloudDownloadedVersion = null;
    }
    if (
      semver.gt(version, currentVersion.version) &&
      (!cloudDownloadedVersion || semver.gt(version, cloudDownloadedVersion))
    ) {
      logger.info(`New version available: ${version}`);
      const zipUrl = json.assets.find(x => x.name == 'cloud-build.zip').browser_download_url;

      const writer = fs.createWriteStream(process.env.CLOUD_UPGRADE_FILE);

      const response = await axios.default({
        url: zipUrl,
        method: 'GET',
        responseType: 'stream',
      });

      response.data.pipe(writer);

      await new Promise((resolve, reject) => {
        writer.on('finish', resolve);
        writer.on('error', reject);
      });
      await fsp.writeFile(process.env.CLOUD_UPGRADE_FILE + '.version', version);

      logger.info(`Downloaded new version from ${zipUrl}`);
    } else {
      logger.info(`Checked version ${version} is not newer than ${cloudDownloadedVersion ?? currentVersion.version}, upgrade skippped`);
    }
  } catch (err) {
    logger.error(extractErrorLogData(err), 'Error checking cloud upgrade');
  }
}

function startCloudUpgradeTimer() {
  // at first in 5 seconds
  setTimeout(checkCloudUpgrade, 5000);

  // hourly
  setInterval(checkCloudUpgrade, 60 * 60 * 1000);
}

module.exports = startCloudUpgradeTimer;
