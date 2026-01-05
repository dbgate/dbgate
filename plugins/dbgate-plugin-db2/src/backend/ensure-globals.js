// Helper module to ensure global packages are properly initialized
// This should be imported before any other DB2 plugin modules

// Import Electron helpers
const electronHelpers = require('./electron-helpers');

/**
 * Ensures that the required global packages are available in the global.DBGATE_PACKAGES object
 * This prevents the "Cannot find module 'dbgate-tools'" error
 */
function ensureGlobalPackages() {
  // First check if we're in an Electron environment and set up accordingly
  const isElectron = electronHelpers.setupDb2ForElectron();
  
  if (isElectron) {
    console.log('[DB2] Running in Electron environment, ensuring special initialization');
  }
  
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
      
      // Special handling for Electron environment
      if (isElectron) {
        try {
          console.log('[DB2] Attempting alternate method to load dbgate-tools in Electron');
          const path = require('path');
          const electron = require('electron');
          const app = electron.app || (electron.remote && electron.remote.app);
          
          if (app) {
            const appPath = app.getAppPath();
            const toolsPath = path.join(appPath, 'node_modules', 'dbgate-tools');
            global.DBGATE_PACKAGES['dbgate-tools'] = require(toolsPath);
            console.log('[DB2] Successfully loaded dbgate-tools from alternate path');
          }
        } catch (electronErr) {
          console.error('[DB2] Electron alternate load failed:', electronErr.message);
          throw new Error(`DB2 plugin requires dbgate-tools: ${err.message}`);
        }
      } else {
        throw new Error(`DB2 plugin requires dbgate-tools: ${err.message}`);
      }
    }
  }
  
  // Check for dbgate-sqltree and initialize it if needed
  if (!global.DBGATE_PACKAGES['dbgate-sqltree']) {
    try {
      console.log('[DB2] Loading dbgate-sqltree into global.DBGATE_PACKAGES');
      global.DBGATE_PACKAGES['dbgate-sqltree'] = require('dbgate-sqltree');
    } catch (err) {
      console.error('[DB2] Failed to load dbgate-sqltree:', err.message);
      
      // Special handling for Electron environment
      if (isElectron) {
        try {
          console.log('[DB2] Attempting alternate method to load dbgate-sqltree in Electron');
          const path = require('path');
          const electron = require('electron');
          const app = electron.app || (electron.remote && electron.remote.app);
          
          if (app) {
            const appPath = app.getAppPath();
            const sqltreePath = path.join(appPath, 'node_modules', 'dbgate-sqltree');
            global.DBGATE_PACKAGES['dbgate-sqltree'] = require(sqltreePath);
            console.log('[DB2] Successfully loaded dbgate-sqltree from alternate path');
          }
        } catch (electronErr) {
          console.error('[DB2] Electron alternate load failed:', electronErr.message);
          throw new Error(`DB2 plugin requires dbgate-sqltree: ${err.message}`);
        }
      } else {
        throw new Error(`DB2 plugin requires dbgate-sqltree: ${err.message}`);
      }
    }
  }
  
  return global.DBGATE_PACKAGES;
}

module.exports = {
  ensureGlobalPackages
};
