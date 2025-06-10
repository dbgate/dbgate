// Helper module to ensure global packages are properly initialized
// This should be imported before any other DB2 plugin modules

/**
 * Ensures that the required global packages are available in the global.DBGATE_PACKAGES object
 * This prevents the "Cannot find module 'dbgate-tools'" error
 */
function ensureGlobalPackages() {
  if (!global.DBGATE_PACKAGES) {
    console.log('[DB2] Initializing global.DBGATE_PACKAGES');
    global.DBGATE_PACKAGES = {};
  }
  
  // Check for dbgate-tools and initialize it if needed
  if (!global.DBGATE_PACKAGES['dbgate-tools']) {
    try {
      console.log('[DB2] Loading dbgate-tools into global.DBGATE_PACKAGES');
      global.DBGATE_PACKAGES['dbgate-tools'] = require('dbgate-tools');
    } catch (err) {
      console.error('[DB2] Failed to load dbgate-tools:', err.message);
      throw new Error(`DB2 plugin requires dbgate-tools: ${err.message}`);
    }
  }
  
  // Check for dbgate-sqltree and initialize it if needed
  if (!global.DBGATE_PACKAGES['dbgate-sqltree']) {
    try {
      console.log('[DB2] Loading dbgate-sqltree into global.DBGATE_PACKAGES');
      global.DBGATE_PACKAGES['dbgate-sqltree'] = require('dbgate-sqltree');
    } catch (err) {
      console.error('[DB2] Failed to load dbgate-sqltree:', err.message);
      throw new Error(`DB2 plugin requires dbgate-sqltree: ${err.message}`);
    }
  }
  
  return global.DBGATE_PACKAGES;
}

module.exports = {
  ensureGlobalPackages
};
