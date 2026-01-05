// Custom ibm_db loader for Electron environment
// This module provides a safe way to load the ibm_db native module in Electron

const path = require('path');
const fs = require('fs');
const { isElectronEnvironment } = require('./electron-helpers');

/**
 * Attempts to load the ibm_db module in Electron with special handling
 */
function loadIbmDbForElectron() {
  if (!isElectronEnvironment()) {
    // If not in Electron, use the standard require
    return require('ibm_db');
  }
  
  console.log('[DB2] Using electron-specific ibm_db loader');
  
  try {
    // First try the standard require
    return require('ibm_db');
  } catch (err) {
    console.error('[DB2] Standard ibm_db loading failed in Electron:', err.message);
    
    // Try to find the module in different locations
    const possibleLocations = findPossibleModuleLocations();
    
    for (const location of possibleLocations) {
      try {
        console.log('[DB2] Trying to load ibm_db from:', location);
        const ibmdb = require(location);
        console.log('[DB2] Successfully loaded ibm_db from:', location);
        return ibmdb;
      } catch (locErr) {
        console.log('[DB2] Failed to load from location:', location);
      }
    }
    
    // If all attempts fail, throw an error with detailed information
    throw new Error(`
      Failed to load ibm_db module in Electron environment.
      
      Original error: ${err.message}
      
      Attempted locations:
      ${possibleLocations.join('\n')}
      
      Make sure ibm_db is installed properly and compatible with Electron.
      Check if .node files are properly unpacked from asar archives.
    `);
  }
}

/**
 * Finds possible locations for the ibm_db module in an Electron environment
 * @returns {string[]} Array of possible locations
 */
function findPossibleModuleLocations() {
  const locations = [];
  
  try {
    // Get app path in Electron
    const electron = require('electron');
    const app = electron.app || (electron.remote && electron.remote.app);
    
    if (app) {
      const appPath = app.getAppPath();
      
      // Add standard locations
      locations.push(
        path.join(appPath, 'node_modules', 'ibm_db'),
        path.join(appPath, '..', 'node_modules', 'ibm_db'),
        path.join(appPath, 'plugins', 'dbgate-plugin-db2', 'node_modules', 'ibm_db')
      );
      
      // Check for unpacked .node files
      const unpackedDir = path.join(appPath, '..', 'app.asar.unpacked');
      if (fs.existsSync(unpackedDir)) {
        locations.push(
          path.join(unpackedDir, 'node_modules', 'ibm_db'),
          path.join(unpackedDir, 'plugins', 'dbgate-plugin-db2', 'node_modules', 'ibm_db')
        );
      }
    }
  } catch (err) {
    console.error('[DB2] Error finding module locations:', err);
  }
  
  // Add user-specific locations based on platform
  if (process.platform === 'win32') {
    const userProfile = process.env.USERPROFILE;
    if (userProfile) {
      locations.push(path.join(userProfile, '.node_modules', 'ibm_db'));
    }
  } else {
    const home = process.env.HOME;
    if (home) {
      locations.push(path.join(home, '.node_modules', 'ibm_db'));
    }
  }
  
  // Add global node_modules locations
  locations.push(
    path.resolve(process.execPath, '..', '..', 'node_modules', 'ibm_db'),
    path.resolve(process.execPath, '..', '..', 'lib', 'node_modules', 'ibm_db')
  );
  
  return locations;
}

module.exports = loadIbmDbForElectron;
