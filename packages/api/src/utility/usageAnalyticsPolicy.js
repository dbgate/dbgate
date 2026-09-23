function getUsageAnalyticsEnvironmentPolicy() {
  const value = process.env.USAGE_ANALYTICS?.trim().toLowerCase();
  if (value === 'true') return true;
  if (value === 'false') return false;
  return null;
}

async function getUsageAnalyticsPolicy() {
  const environmentPolicy = getUsageAnalyticsEnvironmentPolicy();
  if (environmentPolicy !== null) return environmentPolicy;
  if (!process.env.STORAGE_DATABASE) return null;
  const settings = await require('../controllers/config').getSettings();
  if (settings['storage.usageAnalytics'] === 'enabled') return true;
  if (settings['storage.usageAnalytics'] === 'disabled') return false;
  return null;
}

module.exports = { getUsageAnalyticsPolicy, getUsageAnalyticsEnvironmentPolicy };
