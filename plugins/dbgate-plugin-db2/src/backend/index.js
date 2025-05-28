   const driver = require('./driver');
// Import the fixes
const fixSchemaListIssue = require('./fixSchemaListIssue');
const driverFix = require('./driver-fix');
   
module.exports = {
  packageName: 'dbgate-plugin-db2',
  // Export as an array for consistency with other plugins
  drivers: [driver],
  initialize(dbgateEnv) {
    console.log("[DB2] Initializing DB2 plugin with enhanced error handling...");
    
    // Initialize the driver with dbgateEnv
    driver.initialize && driver.initialize(dbgateEnv);
    
    // Apply all fixes
    fixSchemaListIssue.applyFixes(driver);
    driverFix.fixDriverIssues(driver);
    
    // Log initialization for debugging
    console.log("[DB2] Plugin initialized with schema list and SQL endpoint fixes");
  },
};