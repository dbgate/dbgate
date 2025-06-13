// Helper functions for Electron environment
// This module helps with Electron-specific initialization and module loading

/**
 * Detects if the code is running in an Electron environment
 * @returns {boolean} True if running in Electron, false otherwise
 */
function isElectronEnvironment() {
  // Check for Electron-specific process properties
  if (process && process.versions && process.versions.electron) {
    console.log('[DB2] Detected Electron environment version:', process.versions.electron);
    return true;
  }

  // Check if process.type exists and is 'renderer' or 'browser'
  if (process && process.type && (process.type === 'renderer' || process.type === 'browser')) {
    console.log('[DB2] Detected Electron process type:', process.type);
    return true;
  }

  // Don't use navigator in Node.js environment
  try {
    // This will only work in browser environments
    if (typeof window !== 'undefined' && typeof window.navigator !== 'undefined') {
      const userAgent = window.navigator.userAgent.toLowerCase();
      if (userAgent && userAgent.indexOf(' electron/') > -1) {
        console.log('[DB2] Detected Electron in user agent:', userAgent);
        return true;
      }
    }
  } catch (err) {
    // Ignore errors if navigator is not available
  }

  return false;
}

/**
 * Sets up the native module path for Electron
 * This ensures that the ibm_db native module can be found
 */
function setupElectronNativeModulePaths() {
  if (!isElectronEnvironment()) return;
  
  console.log('[DB2] Setting up native module paths for Electron');
  
  try {
    // Get the app path
    const electron = require('electron');
    const app = electron.app || (electron.remote && electron.remote.app);
    
    if (app) {
      const path = require('path');
      const appPath = app.getAppPath();
      const nodeModulesPath = path.join(appPath, 'node_modules');
      
      // Add these directories to the module search path
      module.paths.push(nodeModulesPath);
      
      console.log('[DB2] Added Electron node_modules path:', nodeModulesPath);
    }
  } catch (err) {
    console.error('[DB2] Error setting up Electron module paths:', err);
  }
}

/**
 * Safely loads the ibm_db native module in Electron environment
 * @returns {any} The ibm_db module if successfully loaded, null otherwise
 */
function loadIbmDbInElectron() {
  console.log('[DB2] Attempting to load ibm_db in Electron environment');
  
  try {
    // First try the standard require
    return require('ibm_db');
  } catch (mainErr) {
    console.error('[DB2] Standard ibm_db load failed:', mainErr.message);
    
    try {
      // Try an alternative require approach
      const path = require('path');
      const electron = require('electron');
      const app = electron.app || (electron.remote && electron.remote.app);
      
      if (app) {
        const appPath = app.getAppPath();
        // Look for the native module in various possible locations
        const possiblePaths = [
          path.join(appPath, 'node_modules', 'ibm_db'),
          path.join(appPath, '..', 'node_modules', 'ibm_db'),
          path.join(appPath, 'plugins', 'dbgate-plugin-db2', 'node_modules', 'ibm_db')
        ];
        
        for (const modulePath of possiblePaths) {
          console.log('[DB2] Trying to load ibm_db from:', modulePath);
          try {
            return require(modulePath);
          } catch (err) {
            console.log('[DB2] Failed to load from:', modulePath);
          }
        }
      }
      
      throw new Error('Could not find ibm_db module in Electron environment');
    } catch (err) {
      console.error('[DB2] All ibm_db load attempts failed:', err);
      return null;
    }
  }
}

/**
 * Sets up the DB2 environment for Electron
 * This should be called during plugin initialization when in Electron
 */
function setupDb2ForElectron() {
  if (!isElectronEnvironment()) return false;
  
  console.log('[DB2] Setting up DB2 for Electron environment');
  
  // Setup module paths
  setupElectronNativeModulePaths();
  
  // Set a flag for other parts of the code
  global.DB2_IN_ELECTRON = true;
  
  return true;
}

module.exports = {
  isElectronEnvironment,
  setupElectronNativeModulePaths,
  loadIbmDbInElectron,
  setupDb2ForElectron
};
