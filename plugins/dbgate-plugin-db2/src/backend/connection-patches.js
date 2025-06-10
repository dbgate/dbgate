/**
 * Additional DB2 connection patches
 * This module applies runtime patches to fix issues with DB2 connections
 */

// Ensure global packages are initialized
const { ensureGlobalPackages } = require('./ensure-globals');

/**
 * Applies runtime patches to fix DB2 connection issues
 * @param {Object} driver - The DB2 driver object
 */
function applyConnectionPatches(driver) {
  if (!driver) return;
  
  console.log('[DB2] Applying DB2 connection patches');
  
  // Backup original methods
  const originalConnect = driver.connect;
  
  // Override connect method to ensure proper globals initialization
  if (typeof originalConnect === 'function') {
    driver.connect = async function patchedConnect(...args) {
      // Ensure global packages are initialized before any connection attempt
      ensureGlobalPackages();
      
      console.log('[DB2] Using patched connect method with proper globals initialization');
      
      try {
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
