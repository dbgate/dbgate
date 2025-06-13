/**
 * Additional DB2 connection patches
 * This module applies runtime patches to fix issues with DB2 connections
 */

// Ensure global packages are initialized
const { ensureGlobalPackages } = require('./ensure-globals');
// Import Electron helpers
const electronHelpers = require('./electron-helpers');

/**
 * Applies runtime patches to fix DB2 connection issues
 * @param {Object} driver - The DB2 driver object
 */
function applyConnectionPatches(driver) {
  if (!driver) return;
  
  console.log('[DB2] Applying DB2 connection patches');
  
  // Check if we're in Electron environment
  const isElectron = electronHelpers.isElectronEnvironment();
  if (isElectron) {
    console.log('[DB2] Applying Electron-specific connection patches');
  }
  
  // Backup original methods
  const originalConnect = driver.connect;
  
  // Override connect method to ensure proper globals initialization
  if (typeof originalConnect === 'function') {
    driver.connect = async function patchedConnect(...args) {
      // Ensure global packages are initialized before any connection attempt
      ensureGlobalPackages();
      
      console.log('[DB2] Using patched connect method with proper globals initialization');
      
      try {
        // For Electron environment, ensure ibm_db is loaded correctly
        if (isElectron && global.DB2_IN_ELECTRON) {
          console.log('[DB2] Setting up Electron environment for DB2 connection');
          electronHelpers.setupElectronNativeModulePaths();
        }
        
        return await originalConnect.apply(this, args);
      } catch (err) {
        // Check if error is related to missing global packages
        if (err.message && err.message.includes('Cannot find module') && 
            (err.message.includes('dbgate-tools') || err.message.includes('dbgate-sqltree'))) {
          
          console.error('[DB2] Detected global package error:', err.message);
          console.log('[DB2] Attempting to reinitialize global packages and retry');
          
          // Try to reinitialize global packages and retry
          ensureGlobalPackages();
          
          // Retry connection
          return await originalConnect.apply(this, args);
        }
        
        // Special handling for native module errors in Electron
        if (isElectron && (
          err.message.includes('ibm_db') || 
          err.message.includes('dyld:') || 
          err.message.includes('.node') ||
          err.message.includes('Could not locate the bindings file')
        )) {
          console.error('[DB2] Native module error in Electron:', err);
          console.log('[DB2] Attempting to recover in Electron environment...');
          
          // Try to reload ibm_db module
          try {
            const ibmdb = electronHelpers.loadIbmDbInElectron();
            if (ibmdb) {
              // Replace the ibm_db instance in the driver
              // This is a bit hacky but might help in some cases
              console.log('[DB2] Successfully reloaded ibm_db module, retrying connection');
              return await originalConnect.apply(this, args);
            }
          } catch (reloadErr) {
            console.error('[DB2] Failed to reload ibm_db module:', reloadErr);
          }
        }
        
        // Rethrow other errors
        throw err;
      }
    };
    
    console.log('[DB2] Successfully patched connect method');
  }
  
  return driver;
}

module.exports = {
  applyConnectionPatches
};
