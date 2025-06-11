#!/usr/bin/env node
// Script to verify all DB2 plugin fixes are working

// Check if the plugin folder exists
const fs = require('fs');
const path = require('path');

// Run the test script
console.log('Starting DB2 plugin fixes verification...');

// First check that all required files exist
const requiredFiles = [
  './src/backend/driver.js',
  './src/backend/driver-fix.js',
  './src/backend/fixSchemaListIssue.js',
  './src/backend/cache-manager.js',
  './src/backend/schemaHelper.js',
  './src/backend/index.js'
];

let allFilesExist = true;
for (const file of requiredFiles) {
  if (fs.existsSync(path.join(__dirname, file))) {
    console.log(`✅ ${file} exists`);
  } else {
    console.log(`❌ ${file} missing`);
    allFilesExist = false;
  }
}

if (!allFilesExist) {
  console.error('Some required files are missing. Please check the implementation.');
  process.exit(1);
}

// Run the mock test version (doesn't require actual DB2 connection)
console.log('\nRunning tests with mock DB2 connection...');
try {
  require('./test-all-db2-fixes');
} catch (err) {
  console.error('Error running tests:', err);
  process.exit(1);
}
