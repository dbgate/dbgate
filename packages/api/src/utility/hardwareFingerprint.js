const axios = require('axios');
const os = require('os');
const crypto = require('crypto');
const platformInfo = require('./platformInfo');

async function getPublicIpInfo() {
  try {
    const resp = await axios.default.get('https://ipinfo.io/json');
    if (!resp.data?.ip) {
      return { ip: 'unknown-ip' };
    }
    return resp.data;
  } catch (err) {
    return { ip: 'unknown-ip' };
  }
}

function getMacAddress() {
  try {
    const interfaces = os.networkInterfaces();
    for (let iface of Object.values(interfaces)) {
      for (let config of iface) {
        if (config.mac && config.mac !== '00:00:00:00:00:00') {
          return config.mac;
        }
      }
    }
    return '00:00:00:00:00:00';
  } catch (err) {
    return '00:00:00:00:00:00';
  }
}

async function getHardwareFingerprint() {
  const publicIpInfo = await getPublicIpInfo();
  const macAddress = getMacAddress();
  const platform = os.platform();
  const release = os.release();
  const hostname = os.hostname();
  const totalMemory = os.totalmem();

  return {
    publicIp: publicIpInfo.ip,
    country: publicIpInfo.country,
    region: publicIpInfo.region,
    city: publicIpInfo.city,
    macAddress,
    platform,
    release,
    hostname,
    totalMemory,
  };
}

async function getHardwareFingerprintHash(data = undefined) {
  if (!data) {
    data = await getHardwareFingerprint();
  }
  const fingerprintData = JSON.stringify(data);
  const hash = crypto.createHash('sha256').update(fingerprintData).digest('hex');
  return hash;
}

async function getPublicHardwareFingerprint() {
  const fingerprint = await getHardwareFingerprint();
  const hash = await getHardwareFingerprintHash(fingerprint);
  return {
    hash,
    payload: {
      platform: fingerprint.platform,
      city: fingerprint.city,
      country: fingerprint.country,
      region: fingerprint.region,
      isDocker: platformInfo.isDocker,
      isAwsUbuntuLayout: platformInfo.isAwsUbuntuLayout,
      isAzureUbuntuLayout: platformInfo.isAzureUbuntuLayout,
      isElectron: platformInfo.isElectron,
    },
  };
}

// getHardwareFingerprint().then(console.log);
// getHardwareFingerprintHash().then(console.log);
// getPublicHardwareFingerprint().then(console.log);

module.exports = {
  getHardwareFingerprint,
  getHardwareFingerprintHash,
  getPublicHardwareFingerprint,
};
