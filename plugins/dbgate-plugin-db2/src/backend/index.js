   // Ensure global packages are initialized first
const { ensureGlobalPackages } = require('./ensure-globals');
ensureGlobalPackages();

// Import Electron helpers
const electronHelpers = require('./electron-helpers');

const driver = require('./driver');
// Import the fixes
const fixSchemaListIssue = require('./fixSchemaListIssue');
const driverFix = require('./driver-fix');
const connectionDiagnostics = require('./connection-diagnostics');
const serverHealthMonitor = require('./server-health');
const { applyConnectionPatches } = require('./connection-patches');
   
// Import electron diagnostic tools
const electronDiagnostic = require('./electron-diagnostic');

module.exports = {
  packageName: 'dbgate-plugin-db2',
  // Export as an array for consistency with other plugins
  drivers: [driver],
  
  // Add commands for diagnostic functionality
  commands: {
    runElectronDiagnostics: async () => {
      console.log("[DB2] Running Electron diagnostics...");
      const diagnosticsPath = await electronDiagnostic.runDiagnostics();
      return { 
        status: 'success', 
        message: 'Diagnostics completed successfully', 
        diagnosticsPath 
      };
    }
  },
  
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
  },  initialize(dbgateEnv) {
    console.log("[DB2] Initializing DB2 plugin with enhanced connection handling...");
    
    // Check if running in Electron and handle accordingly
    const isElectron = electronHelpers.isElectronEnvironment();
    if (isElectron) {
      console.log("[DB2] Running in Electron environment - applying special initialization");
      electronHelpers.setupDb2ForElectron();
    }
    
    // Ensure global packages are initialized
    ensureGlobalPackages();
    
    // Initialize the driver with dbgateEnv
    driver.initialize && driver.initialize(dbgateEnv);
    
    // Apply all fixes
    fixSchemaListIssue.applyFixes(driver);
    driverFix.fixDriverIssues(driver);
    applyConnectionPatches(driver);
    
    // Initialize server health monitoring
    if (serverHealthMonitor.initialize) {
      serverHealthMonitor.initialize();
    }
    
    // Log initialization for debugging
    console.log("[DB2] Plugin initialized with enhanced connection handling and diagnostics");
  },
};