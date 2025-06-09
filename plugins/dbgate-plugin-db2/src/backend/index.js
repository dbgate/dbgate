   const driver = require('./driver');
// Import the fixes
const fixSchemaListIssue = require('./fixSchemaListIssue');
const driverFix = require('./driver-fix');
const connectionDiagnostics = require('./connection-diagnostics');
const serverHealthMonitor = require('./server-health');
   
module.exports = {
  packageName: 'dbgate-plugin-db2',
  // Export as an array for consistency with other plugins
  drivers: [driver],
  
  // Expose script handlers for connection diagnostics
  async testConnectivity(params) {
    console.log("[DB2] Running connection diagnostics:", params);
    return await connectionDiagnostics.runConnectionDiagnostics(params.server, params.port, params.options);
  },
  
  async exportDiagnostics(params) {
    console.log("[DB2] Exporting diagnostics for connection:", params.connectionId);
    return await connectionDiagnostics.exportConnectionDiagnostics(params.connectionId);
  },
  
  async resetServerHealth() {
    console.log("[DB2] Resetting server health data");
    return connectionDiagnostics.resetServerHealth();
  },
  
  initialize(dbgateEnv) {
    console.log("[DB2] Initializing DB2 plugin with enhanced connection handling...");
    
    // Initialize the driver with dbgateEnv
    driver.initialize && driver.initialize(dbgateEnv);
    
    // Apply all fixes
    fixSchemaListIssue.applyFixes(driver);
    driverFix.fixDriverIssues(driver);
    
    // Initialize server health monitoring
    if (serverHealthMonitor.initialize) {
      serverHealthMonitor.initialize();
    }
    
    // Log initialization for debugging
    console.log("[DB2] Plugin initialized with enhanced connection handling and diagnostics");
  },
};