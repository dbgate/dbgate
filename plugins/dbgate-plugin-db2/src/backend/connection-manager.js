// Connection state manager for DB2 plugin
// Enhanced to handle problematic server connections and improve reliability

const EventEmitter = require('events');
const serverHealthMonitor = require('./server-health');
const networkDiagnostics = require('./network-diagnostics');

class ConnectionManager extends EventEmitter {
  constructor() {
    super();
    this.connections = new Map(); // Map of connectionId -> connectionState
    this.recoveryAttempts = new Map(); // Track recovery attempts
    this.statistics = new Map(); // Connection statistics
    this.maxRecoveryAttempts = 5; // Increased from 3
    this.CHECK_INTERVAL = 60000; // Check every minute
    this.EXTENDED_CHECK_INTERVAL = 300000; // 5 minutes for detailed health checks
    this.healthCheckTimer = null;
    this.detailedHealthCheckTimer = null;
    
    // Start periodic health checks
    this.startHealthChecks();
    
    console.log('[DB2] Enhanced connection manager initialized');
  }
  
  registerConnection(connectionId, dbhan) {
    // Get server details for monitoring
    const server = dbhan._connectionParams?.server;
    const port = dbhan._connectionParams?.port;
    
    this.connections.set(connectionId, {
      dbhan,
      lastActivity: Date.now(),
      lastHealthCheck: Date.now(),
      isHealthy: true,
      pendingRequests: 0,
      server,
      port,
      queryCount: 0,
      diagnostics: {
        lastDiagTime: null,
        networkStats: null,
        queryLatencies: []
      },
      // Store original connection parameters for reconnection if needed
      connectionParams: dbhan._connectionParams
    });
    
    // Reset recovery attempts counter
    this.recoveryAttempts.set(connectionId, 0);
    
    // Initialize statistics
    this.statistics.set(connectionId, {
      connectionId,
      server: server || 'unknown',
      port: port || 'unknown',
      connectTime: Date.now(),
      disconnectTime: null,
      queryCount: 0,
      errors: [],
      reconnectionCount: 0,
      totalQueryTime: 0,
      avgQueryTime: 0
    });
    
    console.log(`[DB2] Registered connection ${connectionId} to ${server}:${port}`);
    // Emit event
    this.emit('connection-registered', connectionId, { server, port });
  }
  
  unregisterConnection(connectionId) {
    if (this.connections.has(connectionId)) {
      // Update statistics before removing
      const stats = this.statistics.get(connectionId);
      if (stats) {
        stats.disconnectTime = Date.now();
      }
      
      this.connections.delete(connectionId);
      this.recoveryAttempts.delete(connectionId);
      console.log(`[DB2] Unregistered connection ${connectionId}`);
      // Emit event
      this.emit('connection-unregistered', connectionId);
    }
  }
  
  markActivity(connectionId) {
    const conn = this.connections.get(connectionId);
    if (conn) {
      conn.lastActivity = Date.now();
      conn.queryCount++;
      
      // Update statistics
      const stats = this.statistics.get(connectionId);
      if (stats) {
        stats.queryCount++;
      }
    }
  }
  
  incrementPendingRequests(connectionId) {
    const conn = this.connections.get(connectionId);
    if (conn) {
      conn.pendingRequests++;
      console.log(`[DB2] Connection ${connectionId} pending requests: ${conn.pendingRequests}`);
    }
  }
  
  decrementPendingRequests(connectionId) {
    const conn = this.connections.get(connectionId);
    if (conn) {
      conn.pendingRequests = Math.max(0, conn.pendingRequests - 1);
    }
  }
    async checkConnection(connectionId) {
    const conn = this.connections.get(connectionId);
    if (!conn) return false;
    
    try {
      // Only perform health check if the connection has been active in the last 30 minutes
      const thirtyMinutesAgo = Date.now() - 30 * 60 * 1000;
      if (conn.lastActivity < thirtyMinutesAgo) {
        console.log(`[DB2] Connection ${connectionId} inactive for 30+ minutes, skipping health check`);
        return true; // Skip check for inactive connections
      }
      
      // Check if connection is busy with many pending requests
      if (conn.pendingRequests > 10) {
        console.log(`[DB2] Connection ${connectionId} has ${conn.pendingRequests} pending requests, marking as busy`);
        conn.isBusy = true;
        return true; // Consider busy connections as healthy but mark them
      }
      
      // Use a timeout for health check to prevent hanging
      const timeoutMs = 5000;
      let timedOut = false;
      
      // Create a promise that resolves after timeout
      const timeoutPromise = new Promise(resolve => {
        setTimeout(() => {
          timedOut = true;
          resolve(false);
        }, timeoutMs);
      });
      
      // Create actual query promise
      const queryPromise = (async () => {
        // Perform a simple health check query
        if (conn.dbhan && conn.dbhan.client) {
          try {
            await conn.dbhan.client.query('SELECT 1 FROM SYSIBM.SYSDUMMY1');
            
            if (!timedOut) {
              // Only update if we didn't time out
              conn.isHealthy = true;
              conn.lastHealthCheck = Date.now();
              conn.isBusy = false;
              // Reset recovery attempts on successful check
              this.recoveryAttempts.set(connectionId, 0);
              return true;
            }
          } catch (queryErr) {
            if (!timedOut) {
              console.error(`[DB2] Health check query failed for connection ${connectionId}:`, queryErr.message);
              conn.isHealthy = false;
              return false;
            }
          }
        }
        return false;
      })();
      
      // Race the timeout against the actual query
      const result = await Promise.race([queryPromise, timeoutPromise]);
      
      if (timedOut) {
        console.error(`[DB2] Health check timed out for connection ${connectionId} after ${timeoutMs}ms`);
        conn.isHealthy = false;
        return false;
      }
      
      return result;
    } catch (err) {
      console.error(`[DB2] Health check failed for connection ${connectionId}:`, err.message);
      conn.isHealthy = false;
      return false;
    }
  }
    async recoverConnection(connectionId) {
    const conn = this.connections.get(connectionId);
    if (!conn || !conn.dbhan) return false;
    
    // Track recovery attempts
    const attempts = (this.recoveryAttempts.get(connectionId) || 0) + 1;
    this.recoveryAttempts.set(connectionId, attempts);
    
    if (attempts > this.maxRecoveryAttempts) {
      console.error(`[DB2] Max recovery attempts (${this.maxRecoveryAttempts}) exceeded for connection ${connectionId}`);
      return false;
    }
    
    // Implement exponential backoff for recovery attempts
    const backoffMs = Math.min(1000 * Math.pow(2, attempts - 1), 10000);
    
    console.log(`[DB2] Attempting to recover connection ${connectionId} (attempt ${attempts}/${this.maxRecoveryAttempts}, backoff: ${backoffMs}ms)`);
    
    // Wait for the backoff period before trying recovery
    await new Promise(resolve => setTimeout(resolve, backoffMs));
    
    // Set recovering state to prevent concurrent recovery attempts
    conn.isRecovering = true;
    
    try {
      // Try to close the existing connection properly first
      if (conn.dbhan.client) {
        try {
          await Promise.race([
            conn.dbhan.client.close(),
            new Promise((_, reject) => setTimeout(() => reject(new Error('Close timed out')), 5000))
          ]).catch(err => {
            console.error(`[DB2] Error closing connection during recovery:`, err.message);
          });
        } catch (closeErr) {
          console.error(`[DB2] Error during connection close in recovery:`, closeErr.message);
        }
      }
      
      // Recreate the connection with enhanced parameters
      if (conn.dbhan._connectionParams) {
        const connectParams = {...conn.dbhan._connectionParams};
        
        // Add enhanced parameters for recovery attempts
        connectParams.connectTimeout = 60; // Longer timeout for recovery
        connectParams.connectionRetries = 5 + attempts; // Increase retries based on attempt count
        connectParams.recoveryAttempt = attempts;
        
        // Get required modules
        const connectHelper = require('./connect-fixed');
        
        // Attempt the reconnection with timeout
        console.log(`[DB2] Recreating connection with enhanced parameters`);
        try {
          const newConnection = await Promise.race([
            connectHelper(connectParams),
            new Promise((_, reject) => 
              setTimeout(() => reject(new Error('Connection recreation timed out')), 30000)
            )
          ]);
          
          if (newConnection && newConnection.client) {
            // Update the connection handle with the new client
            conn.dbhan.client = newConnection.client;
            conn.dbhan.database = newConnection.database;
            conn.isHealthy = true;
            conn.isBusy = false;
            conn.pendingRequests = 0; // Reset pending requests
            conn.lastHealthCheck = Date.now();
            conn.lastActivity = Date.now();
            conn.isRecovering = false;
            
            // Validate the new connection with a test query
            try {
              const testResult = await Promise.race([
                newConnection.client.query('SELECT 1 FROM SYSIBM.SYSDUMMY1'),
                new Promise((_, reject) => 
                  setTimeout(() => reject(new Error('Validation query timed out')), 5000)
                )
              ]);
              
              console.log(`[DB2] Successfully recovered and validated connection ${connectionId}`);
              return true;
            } catch (validationErr) {
              console.error(`[DB2] Connection recovery validation failed: ${validationErr.message}`);
              conn.isHealthy = false;
              conn.isRecovering = false;
              return false;
            }
          } else {
            console.error(`[DB2] Recovery returned invalid connection object`);
            conn.isRecovering = false;
            return false;
          }
        } catch (timeoutErr) {
          console.error(`[DB2] Connection recreation timed out: ${timeoutErr.message}`);
          conn.isRecovering = false;
          return false;
        }
      } else {
        console.error(`[DB2] Cannot recover connection ${connectionId}: No connection parameters available`);
        conn.isRecovering = false;
        return false;
      }
    } catch (err) {
      console.error(`[DB2] Failed to recover connection ${connectionId}:`, err.message);
      conn.isRecovering = false;
      return false;
    }
  }
  
  startHealthChecks() {
    if (this.healthCheckTimer) {
      clearInterval(this.healthCheckTimer);
    }
    
    this.healthCheckTimer = setInterval(() => {
      this.runHealthChecks();
    }, this.CHECK_INTERVAL);
    
    console.log(`[DB2] Started periodic health checks (every ${this.CHECK_INTERVAL/1000}s)`);
  }
    async runHealthChecks() {
    console.log('[DB2] Running periodic health checks');
    
    // Count stats for logging
    let totalConnections = 0;
    let healthyConnections = 0;
    let busyConnections = 0;
    let recoveredConnections = 0;
    let failedConnections = 0;
    let skippedConnections = 0;
    
    // Use a more careful approach to avoid overloading the system
    // Process checks sequentially to prevent overwhelming the DB server
    for (const [connectionId, conn] of this.connections.entries()) {
      totalConnections++;
      
      // Skip connections that are currently being recovered
      if (conn.isRecovering) {
        console.log(`[DB2] Skipping health check for connection ${connectionId} - recovery in progress`);
        skippedConnections++;
        continue;
      }
      
      // Skip very recent connections or those with recent activity
      const twoMinutesAgo = Date.now() - 2 * 60 * 1000;
      if (conn.lastHealthCheck > twoMinutesAgo || conn.lastActivity > twoMinutesAgo) {
        if (conn.isHealthy) {
          healthyConnections++;
        } else if (conn.isBusy) {
          busyConnections++;
        }
        continue;
      }
      
      // Skip if too many pending requests (probably busy)
      if (conn.pendingRequests > 5) {
        console.log(`[DB2] Connection ${connectionId} has ${conn.pendingRequests} pending requests, marking as busy`);
        conn.isBusy = true;
        busyConnections++;
        continue;
      }
      
      try {
        // Run health check
        const isHealthy = await this.checkConnection(connectionId);
        
        if (!isHealthy) {
          console.log(`[DB2] Connection ${connectionId} is unhealthy, attempting recovery`);
          
          // Try to recover the connection
          const recovered = await this.recoverConnection(connectionId);
          if (recovered) {
            console.log(`[DB2] Successfully recovered connection ${connectionId}`);
            recoveredConnections++;
          } else {
            console.error(`[DB2] Failed to recover connection ${connectionId}`);
            failedConnections++;
          }
        } else {
          if (conn.isBusy) {
            busyConnections++;
          } else {
            healthyConnections++;
          }
        }
      } catch (err) {
        console.error(`[DB2] Error during health check for connection ${connectionId}:`, err.message);
        failedConnections++;
      }
      
      // Add a small delay between checks to avoid overwhelming the DB server
      await new Promise(resolve => setTimeout(resolve, 500));
    }
    
    console.log(`[DB2] Health check summary: Total=${totalConnections}, Healthy=${healthyConnections}, Busy=${busyConnections}, Recovered=${recoveredConnections}, Failed=${failedConnections}, Skipped=${skippedConnections}`);
    
    // Clean up any old/unused connections
    this.pruneOldConnections();
  }
  
  stopHealthChecks() {
    if (this.healthCheckTimer) {
      clearInterval(this.healthCheckTimer);
      this.healthCheckTimer = null;
      console.log('[DB2] Stopped periodic health checks');
    }
  }
  
  getConnectionStats() {
    const stats = {
      total: this.connections.size,
      healthy: 0,
      unhealthy: 0,
      withPendingRequests: 0,
      connections: []
    };
    
    for (const [connectionId, conn] of this.connections.entries()) {
      if (conn.isHealthy) stats.healthy++;
      else stats.unhealthy++;
      
      if (conn.pendingRequests > 0) stats.withPendingRequests++;
      
      stats.connections.push({
        connectionId,
        isHealthy: conn.isHealthy,
        pendingRequests: conn.pendingRequests,
        lastActivityAgo: Math.floor((Date.now() - conn.lastActivity) / 1000) + 's ago',
        lastHealthCheckAgo: Math.floor((Date.now() - conn.lastHealthCheck) / 1000) + 's ago',
        recoveryAttempts: this.recoveryAttempts.get(connectionId) || 0
      });
    }
    
    return stats;
  }
  
  cleanupStaleConnections(maxAgeMinutes = 120) {
    const cutoff = Date.now() - (maxAgeMinutes * 60 * 1000);
    let removed = 0;
    
    for (const [connectionId, conn] of this.connections.entries()) {
      if (conn.lastActivity < cutoff && conn.pendingRequests === 0) {
        this.unregisterConnection(connectionId);
        removed++;
      }
    }
    
    if (removed > 0) {
      console.log(`[DB2] Removed ${removed} stale connections older than ${maxAgeMinutes} minutes`);
    }
    
    return removed;
  }
  
  // Clean up old or unused connections
  pruneOldConnections() {
    const sixHoursAgo = Date.now() - 6 * 60 * 60 * 1000;
    let prunedCount = 0;
    
    for (const [connectionId, conn] of this.connections.entries()) {
      // If the connection hasn't been used in 6 hours, close and remove it
      if (conn.lastActivity < sixHoursAgo) {
        console.log(`[DB2] Pruning unused connection ${connectionId} (inactive for 6+ hours)`);
        
        try {
          // Try to close the client connection
          if (conn.dbhan && conn.dbhan.client) {
            conn.dbhan.client.close().catch(err => {
              console.error(`[DB2] Error closing connection during pruning:`, err.message);
            });
          }
        } catch (err) {
          console.error(`[DB2] Error during connection pruning:`, err.message);
        }
        
        // Remove from our tracking maps
        this.connections.delete(connectionId);
        this.recoveryAttempts.delete(connectionId);
        prunedCount++;
      }
    }
    
    if (prunedCount > 0) {
      console.log(`[DB2] Pruned ${prunedCount} inactive connections`);
    }
  }
}

// Export a singleton instance
const connectionManager = new ConnectionManager();
module.exports = connectionManager;
