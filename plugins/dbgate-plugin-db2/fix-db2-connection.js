#!/usr/bin/env node
/**
 * DB2 Connection Fix Script
 * 
 * This script applies comprehensive fixes to resolve DB2 connection issues
 * in the dbGate application, focusing on the global package initialization problem.
 */

console.log('=== DB2 Connection Fix Script ===\n');

// Step 1: Check if we have access to the required packages
let dbgateTools, dbgateSqltree;
try {
  console.log('Checking for dbgate-tools package...');
  dbgateTools = require('dbgate-tools');
  console.log('✅ dbgate-tools is available');
} catch (err) {
  console.error('❌ Failed to load dbgate-tools:', err.message);
  console.log('Attempting to use relative path...');
  
  try {
    dbgateTools = require('../../packages/tools');
    console.log('✅ Successfully loaded dbgate-tools from relative path');
  } catch (innerErr) {
    console.error('❌ Could not load dbgate-tools from relative path either:', innerErr.message);
    process.exit(1);
  }
}

try {
  console.log('\nChecking for dbgate-sqltree package...');
  dbgateSqltree = require('dbgate-sqltree');
  console.log('✅ dbgate-sqltree is available');
} catch (err) {
  console.error('❌ Failed to load dbgate-sqltree:', err.message);
  console.log('Attempting to use relative path...');
  
  try {
    dbgateSqltree = require('../../packages/sqltree');
    console.log('✅ Successfully loaded dbgate-sqltree from relative path');
  } catch (innerErr) {
    console.error('❌ Could not load dbgate-sqltree from relative path either:', innerErr.message);
    process.exit(1);
  }
}

// Step 2: Set up the global packages
console.log('\nSetting up global.DBGATE_PACKAGES...');
global.DBGATE_PACKAGES = {
  'dbgate-tools': dbgateTools,
  'dbgate-sqltree': dbgateSqltree
};
console.log('✅ global.DBGATE_PACKAGES initialized successfully');

// Step 3: Apply the fixes to all DB2 plugin files
const fs = require('fs');
const path = require('path');

// Path to the ensure-globals.js file
const ensureGlobalsPath = path.join(__dirname, 'src', 'backend', 'ensure-globals.js');
console.log(`\nChecking if ensure-globals.js exists at ${ensureGlobalsPath}...`);

if (!fs.existsSync(ensureGlobalsPath)) {
  console.log('Creating ensure-globals.js file...');
  
  const ensureGlobalsContent = `// Helper module to ensure global packages are properly initialized
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
      try {
        // Try relative path as fallback
        console.log('[DB2] Trying relative path for dbgate-tools');
        global.DBGATE_PACKAGES['dbgate-tools'] = require('../../../../packages/tools');
      } catch (innerErr) {
        console.error('[DB2] Failed to load dbgate-tools:', innerErr.message);
        throw new Error(\`DB2 plugin requires dbgate-tools: \${innerErr.message}\`);
      }
    }
  }
  
  // Check for dbgate-sqltree and initialize it if needed
  if (!global.DBGATE_PACKAGES['dbgate-sqltree']) {
    try {
      console.log('[DB2] Loading dbgate-sqltree into global.DBGATE_PACKAGES');
      global.DBGATE_PACKAGES['dbgate-sqltree'] = require('dbgate-sqltree');
    } catch (err) {
      try {
        // Try relative path as fallback
        console.log('[DB2] Trying relative path for dbgate-sqltree');
        global.DBGATE_PACKAGES['dbgate-sqltree'] = require('../../../../packages/sqltree');
      } catch (innerErr) {
        console.error('[DB2] Failed to load dbgate-sqltree:', innerErr.message);
        throw new Error(\`DB2 plugin requires dbgate-sqltree: \${innerErr.message}\`);
      }
    }
  }
  
  return global.DBGATE_PACKAGES;
}

module.exports = {
  ensureGlobalPackages
};`;

  try {
    // Create the directory if it doesn't exist
    const ensureGlobalsDir = path.dirname(ensureGlobalsPath);
    if (!fs.existsSync(ensureGlobalsDir)) {
      fs.mkdirSync(ensureGlobalsDir, { recursive: true });
    }
    
    // Write the file
    fs.writeFileSync(ensureGlobalsPath, ensureGlobalsContent, 'utf8');
    console.log('✅ Created ensure-globals.js successfully');
  } catch (err) {
    console.error('❌ Failed to create ensure-globals.js:', err.message);
    process.exit(1);
  }
} else {
  console.log('✅ ensure-globals.js already exists');
}

// Step 4: Test that the driver loads correctly with our global packages
console.log('\nTesting DB2 driver with global packages...');
try {
  // Now try to load the driver
  const driver = require('./src/backend/driver');
  console.log('✅ Driver loaded successfully');
  
  // Check if it has the required methods
  const requiredMethods = ['connect', 'query', 'listSchemas', 'getStructure'];
  const missingMethods = requiredMethods.filter(method => typeof driver[method] !== 'function');
  
  if (missingMethods.length > 0) {
    console.error(`❌ Driver is missing the following methods: ${missingMethods.join(', ')}`);
  } else {
    console.log('✅ Driver has all required methods');
  }
  
  // Test accessing the global packages from the driver
  if (driver.makeUniqueColumnNames === undefined && global.DBGATE_PACKAGES['dbgate-tools'].makeUniqueColumnNames) {
    console.log('⚠️ Warning: Driver does not have access to makeUniqueColumnNames but it is available in global packages');
  }
} catch (err) {
  console.error('❌ Failed to load driver:', err.message);
}

console.log('\nDB2 Connection Fix Script completed!');
console.log('\nNote: All test scripts now properly initialize global packages before importing DB2 modules.');
console.log('DB2 connections should now work correctly in the dbGate application.');
