// DB2 Plugin Electron Diagnostics
// This module provides diagnostic tools for Electron-specific issues

const fs = require('fs');
const path = require('path');
const os = require('os');
const electronHelpers = require('./electron-helpers');

/**
 * Collects diagnostic information about the Electron environment and module paths
 * @returns {Object} Diagnostic information
 */
function collectElectronDiagnostics() {
  const diagnostics = {
    timestamp: new Date().toISOString(),
    isElectron: electronHelpers.isElectronEnvironment(),
    electronVersion: process.versions.electron || 'Not available',
    nodeVersion: process.versions.node,
    platform: process.platform,
    arch: process.arch,
    osPaths: {
      homedir: os.homedir(),
      tmpdir: os.tmpdir()
    },
    processInfo: {
      pid: process.pid,
      cwd: process.cwd(),
      execPath: process.execPath
    },
    modulePaths: [],
    nativeModuleSearchLocations: [],
    ibmDbInfo: collectIbmDbInfo(),
    nativeModules: collectNativeModuleInfo()
  };
  
  // Collect module paths
  if (module && module.paths) {
    diagnostics.modulePaths = module.paths;
  }
  
  return diagnostics;
}

/**
 * Collects information about the ibm_db module
 * @returns {Object} ibm_db module information
 */
function collectIbmDbInfo() {
  const info = {
    installed: false,
    version: null,
    path: null,
    nativeBindingPaths: [],
    errors: []
  };
  
  try {
    // Try to find the ibm_db module
    const resolvedPath = require.resolve('ibm_db');
    info.installed = true;
    info.path = resolvedPath;
    
    // Try to get module version
    try {
      const packageJson = JSON.parse(fs.readFileSync(path.join(path.dirname(resolvedPath), 'package.json'), 'utf8'));
      info.version = packageJson.version;
    } catch (err) {
      info.errors.push(`Failed to read package.json: ${err.message}`);
    }
    
    // Find .node files
    try {
      const moduleDir = path.dirname(resolvedPath);
      const findNodeFiles = (dir, depth = 0) => {
        if (depth > 3) return; // Don't go too deep
        
        try {
          const files = fs.readdirSync(dir);
          for (const file of files) {
            const filePath = path.join(dir, file);
            const stat = fs.statSync(filePath);
            
            if (stat.isFile() && path.extname(file) === '.node') {
              info.nativeBindingPaths.push(filePath);
            } else if (stat.isDirectory() && !file.startsWith('.') && file !== 'node_modules') {
              findNodeFiles(filePath, depth + 1);
            }
          }
        } catch (err) {
          info.errors.push(`Error searching directory ${dir}: ${err.message}`);
        }
      };
      
      findNodeFiles(moduleDir);
    } catch (err) {
      info.errors.push(`Failed to search for native bindings: ${err.message}`);
    }
  } catch (err) {
    info.errors.push(`Cannot locate ibm_db module: ${err.message}`);
  }
  
  return info;
}

/**
 * Collects information about native modules in the application
 * @returns {Object} Native module information
 */
function collectNativeModuleInfo() {
  const info = {
    nodeFiles: [],
    errors: []
  };
  
  // Try to find .node files in the application directory
  try {
    const electron = require('electron');
    const app = electron.app || (electron.remote && electron.remote.app);
    
    if (app) {
      const appPath = app.getAppPath();
      
      const findNodeFiles = (dir, depth = 0) => {
        if (depth > 4) return; // Limit depth to avoid taking too long
        
        try {
          const files = fs.readdirSync(dir);
          for (const file of files) {
            const filePath = path.join(dir, file);
            
            try {
              const stat = fs.statSync(filePath);
              
              if (stat.isFile() && path.extname(file) === '.node') {
                info.nodeFiles.push({
                  path: filePath,
                  size: stat.size,
                  mtime: stat.mtime
                });
              } else if (stat.isDirectory() && !file.startsWith('.') && file !== 'node_modules') {
                // Don't go into node_modules to keep it reasonable
                findNodeFiles(filePath, depth + 1);
              }
            } catch (statErr) {
              // Skip files we can't stat
            }
          }
        } catch (err) {
          info.errors.push(`Error reading directory ${dir}: ${err.message}`);
        }
      };
      
      // Start with the app's node_modules
      const nodeModulesPath = path.join(appPath, 'node_modules');
      if (fs.existsSync(nodeModulesPath)) {
        try {
          // Look for ibm_db specifically
          const ibmDbPath = path.join(nodeModulesPath, 'ibm_db');
          if (fs.existsSync(ibmDbPath)) {
            findNodeFiles(ibmDbPath, 0);
          }
        } catch (err) {
          info.errors.push(`Error searching node_modules: ${err.message}`);
        }
      }
    }
  } catch (err) {
    info.errors.push(`Failed to collect native module info: ${err.message}`);
  }
  
  return info;
}

/**
 * Runs diagnostics and saves the results to a file
 * @returns {Promise<string>} Path to the diagnostics file
 */
async function runDiagnostics() {
  const diagnostics = collectElectronDiagnostics();
  
  try {
    // Save to a file in the user's temp directory
    const tempDir = os.tmpdir();
    const fileName = `db2-electron-diagnostics-${Date.now()}.json`;
    const filePath = path.join(tempDir, fileName);
    
    fs.writeFileSync(filePath, JSON.stringify(diagnostics, null, 2), 'utf8');
    console.log(`[DB2] Saved electron diagnostics to ${filePath}`);
    
    return filePath;
  } catch (err) {
    console.error(`[DB2] Failed to save diagnostics: ${err.message}`);
    return null;
  }
}

module.exports = {
  collectElectronDiagnostics,
  collectIbmDbInfo,
  runDiagnostics
};
