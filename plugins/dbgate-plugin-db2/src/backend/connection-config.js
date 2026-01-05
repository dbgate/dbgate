// Configuration options for DB2 connection system
// This file provides customization options for the connection retry and diagnostics system

/**
 * Default configuration for DB2 connections
 * These values can be overridden in connection settings or plugin configuration
 */
const defaultConfig = {
  // Connection settings
  maxRetries: 3,               // Maximum number of connection retry attempts
  connectionTimeout: 15000,    // Base timeout for connections in milliseconds
  adaptiveRetry: true,         // Whether to use adaptive retry strategies
  
  // Retry timing
  initialRetryDelay: 1000,     // Initial delay between retry attempts in milliseconds
  maxRetryDelay: 30000,        // Maximum delay between retry attempts in milliseconds
  retryBackoffMultiplier: 1.5, // Multiplier for exponential backoff
  jitterFactor: 0.2,           // Randomization factor for retry timing (0-1)
  
  // Server health tracking  
  problematicServerThreshold: 3,      // Failed connections before marking server as problematic
  serverHealthMemoryDays: 7,          // How many days to remember server health information
  problematicServerExtraRetries: 2,   // Additional retries for problematic servers
  problematicServerTimeoutMultiplier: 2, // Timeout multiplier for problematic servers
  
  // Known problematic servers (pre-configured)
  knownProblematicServers: ['45.241.60.18', '45.241.60.19'],
  
  // Server-specific port overrides
  serverPortOverrides: {
    '45.241.60.18': 25000  // Override default port 50000 with 25000 for this server
  },
  
  // Diagnostics
  runNetworkDiagnostics: true,             // Whether to run network diagnostics for failed connections
  fullDiagnosticsForProblematicServers: true, // Run full diagnostics for problematic servers
  logDiagnosticDetails: true,              // Log detailed diagnostic information for failures
  
  // Reconnect settings
  enableReconnect: true,           // Attempt to reconnect lost connections
  maxReconnectAttempts: 3,         // Maximum number of reconnect attempts
  reconnectBackoffMultiplier: 2,   // Backoff multiplier for reconnect attempts
  
  // Logging
  verboseLogging: false,          // Enable verbose logging
  logServerHealth: true,          // Log server health statistics
  logNetworkDiagnostics: true,    // Log network diagnostic results
  logRetryAttempts: true,         // Log retry attempts
};

/**
 * Merges user configuration with default settings
 * @param {object} userConfig - User-provided configuration object
 * @returns {object} - Merged configuration
 */
function getConfig(userConfig = {}) {
  return {
    ...defaultConfig,
    ...userConfig,
  };
}

/**
 * Gets configuration for a specific connection
 * @param {object} connectionParams - Connection parameters
 * @returns {object} - Connection-specific configuration
 */
function getConnectionConfig(connectionParams = {}) {
  // Start with default config
  const config = { ...defaultConfig };
  
  // Override with connection-specific options if provided
  if (connectionParams.connectionOptions) {
    Object.assign(config, connectionParams.connectionOptions);
  }
  
  // Special handling for known problematic servers
  if (connectionParams.server && defaultConfig.knownProblematicServers.includes(connectionParams.server)) {
    config.maxRetries += config.problematicServerExtraRetries;
    config.connectionTimeout *= config.problematicServerTimeoutMultiplier;
    config.runNetworkDiagnostics = true;
    config.fullDiagnosticsForProblematicServers = true;
    
    // Check if we have a port override for this server
    if (defaultConfig.serverPortOverrides && defaultConfig.serverPortOverrides[connectionParams.server]) {
      console.log(`[DB2] Applying port override for server ${connectionParams.server}: using port ${defaultConfig.serverPortOverrides[connectionParams.server]}`);
      config.portOverride = defaultConfig.serverPortOverrides[connectionParams.server];
    }
  }
  
  return config;
}

module.exports = {
  defaultConfig,
  getConfig,
  getConnectionConfig,
};
