# DB2 Connection Fix

This document explains how to fix the DB2 database connection issues in dbGate.

## Problem Description

The DB2 plugin was failing with a "Cannot find module 'dbgate-tools'" error because it was trying to access `global.DBGATE_PACKAGES['dbgate-tools']` before this global object was properly initialized.

## Fix Summary

The issue has been resolved with the following changes:

1. Created a helper module `ensure-globals.js` that properly initializes the required global packages
2. Modified the DB2 driver files to use this helper module
3. Added initialization code to all test files to ensure proper global package setup
4. Created connection patches that handle global package initialization when connecting
5. Updated the plugin initialization process to ensure global packages are available

## Affected Files

The following files have been modified or created:

1. `src/backend/ensure-globals.js` (New file)
2. `src/backend/driver.js` (Modified)
3. `src/backend/index.js` (Modified)
4. `src/backend/connection-patches.js` (New file)
5. Test files:
   - `test-all-db2-fixes.js`
   - `test-schema-loading.js`
   - `test-sql-endpoint-fix.js`
   - `test-schema-fixes.js`
   - `test-network-debug.js`
   - `api-verification.js`

## How to Apply the Fix

### Option 1: Manual Fix

1. Import and call the `ensureGlobalPackages` function at the beginning of any file that uses DB2 functionality:

```javascript
// Import the helper function
const { ensureGlobalPackages } = require('./ensure-globals');

// Initialize global packages
ensureGlobalPackages();

// Now import other modules that depend on global.DBGATE_PACKAGES
const driver = require('./driver');
```

2. For test scripts outside the src directory, initialize global packages directly:

```javascript
// Initialize the required global packages first
global.DBGATE_PACKAGES = {
  'dbgate-tools': require('dbgate-tools'),
  'dbgate-sqltree': require('dbgate-sqltree'),
};

// Now import modules that depend on global.DBGATE_PACKAGES
const driver = require('./src/backend/driver');
```

### Option 2: Automatic Fix

Run the provided fix script:

```bash
node fix-db2-connection.js
```

## Verification

To verify the fix works, run the test script:

```bash
node test-global-initialization.js
```

You should see a successful connection to your DB2 database without any "Cannot find module" errors.

## Additional Notes

- The integration tests already properly initialize `global.DBGATE_PACKAGES` in their `setupTests.js` file
- The fix ensures that all DB2 test scripts and the actual DB2 plugin initialize these global packages correctly
- This approach maintains compatibility with the existing codebase without requiring major architectural changes
