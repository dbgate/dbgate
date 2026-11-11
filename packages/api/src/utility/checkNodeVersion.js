const MIN_NODE_MAJOR = 24;

function parseNodeMajor(version) {
  const match = /^v?(\d+)(\.|$)/.exec(String(version || '').trim());
  if (!match) return null;
  return parseInt(match[1], 10);
}

function isNodeVersionSupported(version = process.versions.node) {
  const major = parseNodeMajor(version);
  if (major == null || isNaN(major)) return true;
  return major >= MIN_NODE_MAJOR;
}

function getNodeVersionWarning(version = process.versions.node) {
  if (isNodeVersionSupported(version)) return null;
  return `DbGate requires Node.js ${MIN_NODE_MAJOR} or newer, but it is running on Node.js ${version}. Some features (eg. SQL Server connections) will not work. Please upgrade Node.js (see https://nodejs.org)`;
}

function checkNodeVersion(logger, version = process.versions.node) {
  try {
    const warning = getNodeVersionWarning(version);
    if (!warning) return true;
    logger.error(`DBGM-00000 ${warning}`);
    return false;
  } catch (err) {
    return true;
  }
}

module.exports = {
  MIN_NODE_MAJOR,
  isNodeVersionSupported,
  getNodeVersionWarning,
  checkNodeVersion,
};
