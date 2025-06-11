// Connection test and diagnostics script for the DB2 plugin
// Provides functions to test connection settings and diagnose problems

// Import required modules
const networkDiagnostics = require('./network-diagnostics');
const serverHealthMonitor = require('./server-health');
const connectionConfig = require('./connection-config');

/**
 * Tests and diagnoses connection to a DB2 server
 * Provides comprehensive diagnostics about server connectivity
 * @param {string} server - DB2 server address
 * @param {number} port - DB2 server port
 * @param {object} options - Additional testing options
 * @returns {Promise<object>} - Diagnostic results
 */
async function runConnectionDiagnostics(server, port, options = {}) {
  console.log(`[DB2] Running connection diagnostics for ${server}:${port}`);
  
  // Get configuration with any user overrides
  const config = connectionConfig.getConnectionConfig({
    server,
    port,
    connectionOptions: options
  });
  
  // Results object
  const results = {
    timestamp: new Date().toISOString(),
    server,
    port,
    serverStatus: {
      isKnownProblematic: serverHealthMonitor.isServerProblematic(server),
      healthScore: 0,
      connectionHistory: {}
    },
    networkTests: {},
    connectionRecommendations: {},
    overallAssessment: ''
  };
  
  try {
    // Basic socket test
    console.log('[DB2] Performing basic socket connectivity test');
    const socketTest = await networkDiagnostics.performSocketTest(server, port);
    results.networkTests.socketTest = socketTest;
    
    // If basic connectivity test passes, do more detailed tests
    if (socketTest.isReachable) {
      // Server health information
      const healthInfo = serverHealthMonitor.getServerHealth(server, port);
      results.serverStatus.healthScore = healthInfo?.healthScore || 0;
      results.serverStatus.connectionHistory = {
        successCount: healthInfo?.successCount || 0,
        failureCount: healthInfo?.failureCount || 0,
        lastSuccessTime: healthInfo?.lastSuccessTime,
        lastFailureTime: healthInfo?.lastFailureTime,
        avgConnectionTime: healthInfo?.avgConnectionTime
      };
      
      // Run more comprehensive network tests if enabled
      if (config.runNetworkDiagnostics) {
        console.log('[DB2] Running comprehensive network diagnostics');
        const networkAssessment = await networkDiagnostics.assessNetworkReliability(server, port);
        results.networkTests.fullAssessment = networkAssessment;
        
        // Add packet loss info if available
        results.networkTests.packetLoss = networkAssessment.packetLoss;
      }
      
      // Get connection recommendations
      const recommendations = serverHealthMonitor.getConnectionRecommendations(server, port);
      results.connectionRecommendations = recommendations;
      
      // Overall assessment
      if (results.serverStatus.isKnownProblematic) {
        results.overallAssessment = 'This server is marked as problematic based on connection history. ' +
          'Using enhanced connection parameters is recommended.';
      } else if (results.networkTests.packetLoss > 5) {
        results.overallAssessment = 'Network shows significant packet loss. ' +
          'Connection issues may occur - consider increasing retry counts and timeouts.';
      } else if (socketTest.latency > 500) {
        results.overallAssessment = 'Server has high latency. ' +
          'Consider increasing connection timeouts.';
      } else {
        results.overallAssessment = 'Server appears to be healthy and reachable.';
      }
    } else {
      // Basic connectivity test failed
      results.overallAssessment = `Server unreachable: ${socketTest.message}. ` +
        'Check network connectivity, firewall settings, and server availability.';
    }
    
    // Add configuration details to results
    results.configuration = {
      maxRetries: config.maxRetries,
      connectionTimeout: config.connectionTimeout,
      adaptiveRetry: config.adaptiveRetry,
      retryBackoffMultiplier: config.retryBackoffMultiplier,
      runNetworkDiagnostics: config.runNetworkDiagnostics
    };
    
    return results;
  } catch (err) {
    console.error('[DB2] Error running diagnostics:', err);
    return {
      ...results,
      error: err.message,
      overallAssessment: `Error running diagnostics: ${err.message}`
    };
  }
}

/**
 * Exports connection diagnostics to a file
 * @param {string} connectionId - Connection identifier
 * @returns {Promise<object>} Result of export operation
 */
async function exportConnectionDiagnostics(connectionId) {
  const fs = require('fs');
  const path = require('path');
  const os = require('os');
  
  try {
    // Get server health data
    const healthData = serverHealthMonitor.getAllServerHealthData();
    
    // Get system info
    const systemInfo = {
      platform: os.platform(),
      release: os.release(),
      hostname: os.hostname(),
      architecture: os.arch(),
      cpus: os.cpus().length,
      memory: {
        total: os.totalmem(),
        free: os.freemem()
      },
      networkInterfaces: os.networkInterfaces()
    };
    
    // Prepare diagnostics data
    const diagnosticsData = {
      timestamp: new Date().toISOString(),
      connectionId,
      systemInfo,
      serverHealthData: healthData,
      configDefaults: connectionConfig.defaultConfig
    };
    
    // Create file path
    const filePath = path.join(
      os.tmpdir(), 
      `db2-diagnostics-${connectionId}-${new Date().toISOString().replace(/[:.]/g, '-')}.json`
    );
    
    // Write to file
    fs.writeFileSync(filePath, JSON.stringify(diagnosticsData, null, 2));
    
    return { 
      success: true, 
      message: 'Diagnostics exported successfully',
      filePath
    };
  } catch (err) {
    console.error('[DB2] Error exporting diagnostics:', err);
    return {
      success: false,
      error: err.message
    };
  }
}

/**
 * Resets the server health monitoring data
 */
function resetServerHealth() {
  console.log('[DB2] Resetting server health monitoring data');
  serverHealthMonitor.resetAllServerHealthData();
  return { success: true };
}

module.exports = {
  runConnectionDiagnostics,
  exportConnectionDiagnostics,
  resetServerHealth
};
