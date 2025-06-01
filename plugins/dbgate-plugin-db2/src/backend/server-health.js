// Server health monitor for DB2 connections

/**
 * ServerHealthMonitor keeps track of DB2 server health across multiple connections
 * and provides optimized connection strategies for problematic servers
 */
class ServerHealthMonitor {
  constructor() {
    this.serverHealth = new Map();
    this.problematicServers = new Set();
    this.knownProblematicServers = ['45.241.60.18', '45.241.60.19'];
    
    // Add known problematic servers to our tracking
    this.knownProblematicServers.forEach(server => {
      this.markServerAsProblematic(server, 'Known problematic server');
    });
    
    console.log('[DB2] Server Health Monitor initialized');
  }
  
  /**
   * Record a successful connection to a server
   * @param {string} server - Server address
   * @param {number} port - Server port
   * @param {number} connectionTime - Time it took to connect in ms
   */
  recordSuccessfulConnection(server, port, connectionTime) {
    if (!server) return;
    
    const key = `${server}:${port}`;
    const now = Date.now();
    
    let record = this.serverHealth.get(key) || {
      server,
      port,
      successCount: 0,
      failureCount: 0,
      lastSuccessTime: null,
      lastFailureTime: null,
      avgConnectionTime: 0,
      healthScore: 50, // Start with neutral score
      connectionHistory: []
    };
    
    // Update stats
    record.successCount++;
    record.lastSuccessTime = now;
    
    // Keep track of connection times (using a weighted average)
    if (record.avgConnectionTime === 0) {
      record.avgConnectionTime = connectionTime;
    } else {
      // 80% of previous average + 20% of new value
      record.avgConnectionTime = (record.avgConnectionTime * 0.8) + (connectionTime * 0.2);
    }
    
    // Update health score (success improves score)
    record.healthScore = Math.min(100, record.healthScore + 5);
    
    // Add to connection history (keep last 10)
    record.connectionHistory.unshift({
      timestamp: now,
      success: true,
      time: connectionTime
    });
    record.connectionHistory = record.connectionHistory.slice(0, 10);
    
    // Update the record
    this.serverHealth.set(key, record);
    
    // If server was previously marked problematic but has good health now,
    // consider removing it from problematic servers
    if (this.problematicServers.has(server) && record.healthScore > 70) {
      const successRate = record.successCount / (record.successCount + record.failureCount);
      if (successRate > 0.7) {
        this.problematicServers.delete(server);
        console.log(`[DB2] Server ${server} removed from problematic server list due to improved health`);
      }
    }
    
    console.log(`[DB2] Recorded successful connection to ${key}, health score: ${record.healthScore}`);
  }
  
  /**
   * Record a failed connection attempt to a server
   * @param {string} server - Server address
   * @param {number} port - Server port
   * @param {string} errorCode - Error code if available
   * @param {string} errorMessage - Error message
   * @param {number} attemptDuration - How long the attempt took before failing
   */
  recordFailedConnection(server, port, errorCode, errorMessage, attemptDuration) {
    if (!server) return;
    
    const key = `${server}:${port}`;
    const now = Date.now();
    
    let record = this.serverHealth.get(key) || {
      server,
      port,
      successCount: 0,
      failureCount: 0,
      lastSuccessTime: null,
      lastFailureTime: null,
      avgConnectionTime: 0,
      healthScore: 50, // Start with neutral score
      connectionHistory: [],
      errors: {}
    };
    
    // Update stats
    record.failureCount++;
    record.lastFailureTime = now;
    
    // Track specific error codes
    record.errors = record.errors || {};
    record.errors[errorCode] = (record.errors[errorCode] || 0) + 1;
    
    // Update health score (failure reduces score)
    const failurePenalty = this.getFailurePenalty(errorCode);
    record.healthScore = Math.max(0, record.healthScore - failurePenalty);
    
    // Add to connection history (keep last 10)
    record.connectionHistory.unshift({
      timestamp: now,
      success: false,
      errorCode,
      errorMessage: errorMessage?.substring(0, 100), // Truncate long messages
      time: attemptDuration
    });
    record.connectionHistory = record.connectionHistory.slice(0, 10);
    
    // Update the record
    this.serverHealth.set(key, record);
    
    // Check if server should be marked as problematic
    if (record.healthScore < 30 || this.isErrorPatternProblematic(record)) {
      this.markServerAsProblematic(server, `Low health score (${record.healthScore}) and error pattern`);
    }
    
    console.log(`[DB2] Recorded failed connection to ${key}, health score: ${record.healthScore}`);
  }
  
  /**
   * Mark a server as problematic
   * @param {string} server - Server address
   * @param {string} reason - Reason for marking as problematic
   */
  markServerAsProblematic(server, reason) {
    if (!server) return;
    
    this.problematicServers.add(server);
    console.log(`[DB2] Server ${server} marked as problematic: ${reason}`);
  }
  
  /**
   * Check if a server is marked as problematic
   * @param {string} server - Server address 
   * @returns {boolean} - True if server is problematic
   */
  isServerProblematic(server) {
    if (!server) return false;
    
    return this.problematicServers.has(server) || 
      this.knownProblematicServers.includes(server) ||
      (server && server.startsWith('45.241.60.'));
  }
  
  /**
   * Get connection recommendations for a server
   * @param {string} server - Server address
   * @param {number} port - Server port
   * @returns {object} - Connection recommendations
   */
  getConnectionRecommendations(server, port) {
    if (!server) {
      return this.getDefaultRecommendations();
    }
    
    const key = `${server}:${port}`;
    const record = this.serverHealth.get(key);
    const isProblematic = this.isServerProblematic(server);
    
    // If we have no record or the server is known to be problematic
    if (!record || isProblematic) {
      return this.getProblematicServerRecommendations(server);
    }
    
    // Base recommendations on health score
    if (record.healthScore >= 80) {
      // Healthy server
      return {
        maxRetries: 5,
        baseTimeout: 40000,
        maxTimeout: 180000,
        retryDelayBase: 2000,
        useExponentialBackoff: true,
        jitterPercent: 10,
        isProblematicServer: false,
        healthScore: record.healthScore,
        reason: 'Healthy server with good connection history'
      };
    } else if (record.healthScore >= 40) {
      // Moderately healthy server
      return {
        maxRetries: 6,
        baseTimeout: 60000,
        maxTimeout: 240000,
        retryDelayBase: 4000,
        useExponentialBackoff: true,
        jitterPercent: 15,
        isProblematicServer: false,
        healthScore: record.healthScore,
        reason: 'Moderately healthy server'
      };
    } else {
      // Unhealthy server
      return {
        maxRetries: 8,
        baseTimeout: 90000,
        maxTimeout: 360000,
        retryDelayBase: 8000,
        useExponentialBackoff: true,
        jitterPercent: 20,
        isProblematicServer: true,
        healthScore: record.healthScore,
        reason: 'Unhealthy server with poor connection history'
      };
    }
  }
  
  /**
   * Get default connection recommendations
   * @returns {object} - Default connection recommendations
   */
  getDefaultRecommendations() {
    return {
      maxRetries: 7,
      baseTimeout: 45000,
      maxTimeout: 240000,
      retryDelayBase: 3000,
      useExponentialBackoff: true,
      jitterPercent: 15,
      isProblematicServer: false,
      healthScore: 50,
      reason: 'Default recommendations, no server history'
    };
  }
  
  /**
   * Get connection recommendations for known problematic servers
   * @param {string} server - Server address 
   * @returns {object} - Recommendations for problematic server
   */
  getProblematicServerRecommendations(server) {
    // Special handling for known problematic servers like 45.241.60.18
    const isSpecificProblematicServer = this.knownProblematicServers.includes(server);
    
    if (isSpecificProblematicServer) {
      return {
        maxRetries: 10,
        baseTimeout: 120000,
        maxTimeout: 420000,
        retryDelayBase: 15000,
        useExponentialBackoff: true,
        jitterPercent: 25,
        isProblematicServer: true,
        healthScore: 10,
        reason: 'Known problematic server with specific handling'
      };
    }
    
    return {
      maxRetries: 8,
      baseTimeout: 90000,
      maxTimeout: 360000,
      retryDelayBase: 10000,
      useExponentialBackoff: true,
      jitterPercent: 20,
      isProblematicServer: true,
      healthScore: 20,
      reason: 'Server marked as problematic'
    };
  }
  
  /**
   * Calculate failure penalty based on error code
   * @param {string} errorCode - Error code 
   * @returns {number} - Penalty to apply to health score
   */
  getFailurePenalty(errorCode) {
    if (!errorCode) return 10;
    
    // TCP connection timeout errors are more severe
    if (errorCode === '10060') {
      return 15;
    }
    
    // Connection refused often indicates server issues
    if (errorCode === '10061') {
      return 20;
    }
    
    // Connection reset indicates unstable connection
    if (errorCode === '10053' || errorCode === '10054') {
      return 12;
    }
    
    // Default penalty
    return 10;
  }
  
  /**
   * Analyze error pattern to identify problematic servers
   * @param {object} record - Server health record 
   * @returns {boolean} - True if error pattern indicates problematic server
   */
  isErrorPatternProblematic(record) {
    if (!record || !record.errors) return false;
    
    // If we have multiple timeout errors
    if (record.errors['10060'] && record.errors['10060'] >= 3) {
      return true;
    }
    
    // If we have more failures than successes by a significant margin
    if (record.failureCount > 5 && record.failureCount > record.successCount * 2) {
      return true;
    }
    
    return false;
  }
  
  /**
   * Get health report for all servers
   * @returns {Array} - Array of server health records
   */
  getHealthReport() {
    const report = [];
    
    for (const [key, record] of this.serverHealth.entries()) {
      report.push({
        server: record.server,
        port: record.port,
        healthScore: record.healthScore,
        successCount: record.successCount,
        failureCount: record.failureCount,
        lastSuccessTime: record.lastSuccessTime ? new Date(record.lastSuccessTime).toISOString() : null,
        lastFailureTime: record.lastFailureTime ? new Date(record.lastFailureTime).toISOString() : null,
        avgConnectionTime: Math.round(record.avgConnectionTime),
        isProblematic: this.isServerProblematic(record.server)
      });
    }
    
    return report;
  }
}

// Create singleton instance
const healthMonitor = new ServerHealthMonitor();

module.exports = healthMonitor;
