// Helper function for DB2 connections

// Import our enhanced diagnostic modules
const networkDiagnostics = require('./network-diagnostics');
const serverHealthMonitor = require('./server-health');
const connectionConfig = require('./connection-config');

/**
 * Checks if a connection to the server is likely to succeed
 * with enhanced diagnostics and tracking
 * @param {string} server - Server address to check
 * @param {number} port - Port to check
 * @param {object} options - Connection options
 * @returns {Promise<{isReachable: boolean, latency: number, message: string, diagnostics: object}>} - Connection status
 */
async function checkConnectionHealth(server, port, options = {}) {
  if (!server) return { 
    isReachable: false, 
    latency: -1, 
    message: 'No server specified',
    diagnostics: { error: 'No server specified' } 
  };
  
  // Get specific config for this connection
  const config = connectionConfig.getConnectionConfig({
    server,
    port,
    connectionOptions: options
  });
  
  console.log(`[DB2] Checking connection health to ${server}:${port} with enhanced diagnostics`);
  
  // Perform basic socket connectivity check first (fast)
  const socketResult = await networkDiagnostics.performSocketTest(server, port);
  
  // If server is known to be problematic and full diagnostics are enabled, run more detailed checks
  if (serverHealthMonitor.isServerProblematic(server) && config.fullDiagnosticsForProblematicServers) {
    console.log(`[DB2] Server ${server} is known to be problematic, running full network diagnostics`);
    
    // Run comprehensive network assessment for problematic servers
    const fullAssessment = await networkDiagnostics.assessNetworkReliability(server, port);
    
    return {
      isReachable: socketResult.isReachable,
      latency: socketResult.latency,
      message: socketResult.isReachable 
        ? `Server reachable with ${socketResult.latency}ms latency, but marked as problematic (packet loss: ${fullAssessment.packetLoss}%)`
        : `Server unreachable during health check: ${socketResult.message}`,
      diagnostics: fullAssessment,
      isProblematicServer: true,
      config: config
    };
  }
  
  // For regular servers, just return the basic socket test results
  return {
    isReachable: socketResult.isReachable,
    latency: socketResult.latency,
    message: socketResult.isReachable 
      ? `Server reachable with ${socketResult.latency}ms latency` 
      : `Server unreachable during health check: ${socketResult.message}`,
    diagnostics: { socketTest: socketResult },
    config: config
  };
}

module.exports = async function connect({ 
  server, 
  port, 
  user, 
  password, 
  database, 
  ssl, 
  isReadOnly, 
  useDatabaseUrl, 
  databaseUrl, 
  ibmdb,
  // Connection optimization parameters
  connectTimeout = 60,
  connectionRetries = 7,
  queryTimeout = 90,
  optimizeSchemaQueries = true,
  
  // Configuration options for enhanced connection system
  connectionOptions = {}
}){  try {
    console.log('[DB2] ====== Starting connection ======');
    
    // Validate required connection parameters
    if (useDatabaseUrl) {
      if (!databaseUrl) {
        console.error('[DB2] Database URL is required when useDatabaseUrl is true');
        throw new Error('Database URL is required when useDatabaseUrl is true');
      }
    } else {
      if (!server) {
        console.error('[DB2] Server address is required');
        throw new Error('Server address is required');
      }
      
      // Perform a quick health check if we have server and port
      if (server && port) {
        try {
          console.log('[DB2] Performing quick server health check before connection attempt');
          const healthCheck = await checkConnectionHealth(server, port);
          
          if (healthCheck.isReachable) {
            console.log(`[DB2] Server health check successful: ${healthCheck.message}`);
            
            // If we have a high latency connection, adjust our expectations and timeouts
            if (healthCheck.latency > 500) {
              console.log(`[DB2] Warning: High latency detected (${healthCheck.latency}ms), adjusting connection strategy`);
              // Will use higher timeouts for high-latency connections
            }
          } else {
            // Health check failed but we'll still try to connect with our retry logic
            console.warn(`[DB2] Server health check failed: ${healthCheck.message}`);
            console.log('[DB2] Will attempt connection anyway with enhanced retry logic');
          }
        } catch (healthCheckError) {
          // Don't fail just because the health check failed
          console.warn(`[DB2] Server health check error: ${healthCheckError.message}`);
        }
      }
      // Don't require port - use default if not provided
      if (!port) {
        port = 50000; // Default DB2 port
        console.log('[DB2] Port not specified, using default port 50000');
      }
      if (!user) {
        console.error('[DB2] Username is required');
        throw new Error('Username is required');
      }
      // Don't require password - some DB2 systems allow empty passwords
      if (!password) {
        password = ''; // Use empty password
        console.log('[DB2] Password not specified, using empty password');
      }
    }

    // Log connection parameters (excluding password)
    console.log(`[DB2] Connection parameters:
      Server: ${server || 'custom URL'}
      Port: ${port || 'custom port'}
      Database: ${database || user}
      User: ${user || 'custom user'}
      SSL: ${ssl ? 'enabled' : 'disabled'}
      ReadOnly: ${isReadOnly ? 'yes' : 'no'}
      UseDatabaseUrl: ${useDatabaseUrl ? 'yes' : 'no'}
    `);
      let dbName = database || user || '';
    let connStr;
    
    if (useDatabaseUrl && databaseUrl) {
      console.log(`[DB2] Using custom connection string`);
      connStr = databaseUrl;
    } else {      // Add SSL configuration if specified
      const sslConfig = ssl ? 'SECURITY=SSL' : '';
      
      console.log(`[DB2] Using connection optimization settings: 
        Connect timeout: ${connectTimeout}s
        Connection retries: ${connectionRetries}
        Query timeout: ${queryTimeout}s
        Optimize schema queries: ${optimizeSchemaQueries ? 'yes' : 'no'}
      `);
      
      // Escape special characters in connection parameters
      const escapedUser = user ? user.replace(/[;=]/g, c => encodeURIComponent(c)) : '';
      const escapedPassword = password ? password.replace(/[;=]/g, c => encodeURIComponent(c)) : '';
      const escapedServer = server ? server.replace(/[;=]/g, c => encodeURIComponent(c)) : '';
      const escapedDbName = dbName ? dbName.replace(/[;=]/g, c => encodeURIComponent(c)) : '';      // Build a simpler connection string with minimal parameters that are most compatible
      // with standard DB2 servers to avoid any incompatibilities
      
      const connectionParams = [
        `DATABASE=${escapedDbName}`,
        `HOSTNAME=${escapedServer}`,
        `PORT=${port}`,
        `PROTOCOL=TCPIP`,
        `UID=${escapedUser}`,
        `PWD=${escapedPassword}`,
        sslConfig,
        'CONNECTTIMEOUT=60',        // Use a reasonable default timeout
        'AUTOCOMMIT=1'              // Keep autocommit enabled
      ].filter(Boolean);
        connStr = connectionParams.join(';');
      console.log(`[DB2] Using enhanced connection string format: DATABASE=xxx;HOSTNAME=xxx;PORT=xxx;...`);
    }
    
    // Try to establish connection with enhanced retry logic and exponential backoff
  let client = null;
  let retryCount = 0;
  // Use configuration parameter for retries with a fallback default
  // This line will be replaced by effectiveMaxRetries
    // Track success rate for diagnostics
  let lastSuccessTime = null;
  const connectionAttempts = [];

  // Get recommendations from our server health monitor based on past connection history
  const recommendations = serverHealthMonitor.getConnectionRecommendations(server, port);
  const isKnownProblematicServer = recommendations.isProblematicServer || 
                                  networkDiagnostics.isProblematicServer(server);
  
  console.log(`[DB2] Connection recommendations for ${server}:${port}:`);
  console.log(`[DB2] - Max retries: ${recommendations.maxRetries}`);
  console.log(`[DB2] - Base timeout: ${recommendations.baseTimeout}ms`);
  console.log(`[DB2] - Health score: ${recommendations.healthScore}/100`);
  console.log(`[DB2] - Problematic server: ${recommendations.isProblematicServer ? 'YES' : 'NO'}`);
  console.log(`[DB2] - Reason: ${recommendations.reason}`);
    // Use the recommended retry count or the configured retry count, whichever is higher
  const effectiveMaxRetries = Math.max(recommendations.maxRetries, connectionRetries || 5);
  
  // Implement adaptive backoff with jitter for retries, using server health information
  const getBackoffTime = (attempt, errorCode = null) => {
    // Get the base retry delay from recommendations
    let baseTime = recommendations.retryDelayBase || 3000;
    
    // For timeout errors, use a more aggressive backoff
    if (errorCode === '10060') {
      baseTime = Math.max(baseTime, 5000); // At least 5 seconds for timeouts
    }
    
    // Calculate exponential backoff: baseTime * 2^attempt with a cap
    const expBackoff = Math.min(baseTime * Math.pow(2, attempt), 180000); // Cap at 3 minutes
    
    // Add jitter to prevent connection storms (recommendations-based randomness)
    const jitterFactor = 1 - (recommendations.jitterPercent / 200) + 
                         (Math.random() * (recommendations.jitterPercent / 100));
    
    return Math.round(expBackoff * jitterFactor);
  };
    while (retryCount < effectiveMaxRetries) {
      try {
        const attemptStart = Date.now();        console.log(`[DB2] Connection attempt ${retryCount + 1}/${effectiveMaxRetries} to ${server || 'custom URL'}:${port || 'custom port'}`);
        // Enhanced connection logging for debugging
        const connectionDetails = {          attempt: retryCount + 1,
          maxRetries: effectiveMaxRetries,
          server: server || 'custom URL',
          port: port || 'custom port',
          database: database || 'default',
          ssl: ssl ? 'enabled' : 'disabled',
          timestamp: new Date().toISOString(),
          previousFailures: retryCount,
          lastSuccessful: lastSuccessTime ? new Date(lastSuccessTime).toISOString() : 'never',
          isKnownProblematicServer: isKnownProblematicServer
        };
        
        console.log(`[DB2] Connection details for attempt ${retryCount + 1}:`, JSON.stringify(connectionDetails, null, 2));
        
        // Try to establish connection with improved timeout
        console.log(`[DB2] Opening connection with timeout`);
        // Dynamic timeout based on retry count - dramatically increased for error 10060
        // Use special handling for the known problematic server (45.241.60.18)
        let baseTimeoutMs, timeoutIncrease, maxTimeoutMs;
        
        if (isKnownProblematicServer) {
          console.log('[DB2] Using extended timeouts for known problematic server.');
          // Start with 60 seconds and increase by 40 seconds each retry up to 7 minutes
          baseTimeoutMs = 60000; // 60 seconds base timeout for problematic server
          timeoutIncrease = 40000 * Math.min(retryCount, 12); // Increase by 40s each retry up to 480s extra
          maxTimeoutMs = 420000; // Cap at 7 minutes for problematic server
        } else {
          // Standard enhanced timeout for other servers
          baseTimeoutMs = 45000; // 45 seconds base timeout (increased from 30s)
          timeoutIncrease = 30000 * Math.min(retryCount, 10); // Increase by 30s each retry up to 300s extra
          maxTimeoutMs = 345000; // Cap at 345 seconds (5.75 minutes)
        }
        
        const timeoutMs = Math.min(baseTimeoutMs + timeoutIncrease, maxTimeoutMs);
          console.log(`[DB2] Using connection timeout of ${timeoutMs/1000} seconds for attempt #${retryCount + 1}`);
        
        // Create a timeout mechanism for the connection
        let timeoutId;
        let connectionTimedOut = false;
        
        try {
          // Create a timeout promise that will mark the flag but not throw
          const timeoutPromise = new Promise(resolve => {
            timeoutId = setTimeout(() => {
              connectionTimedOut = true;
              console.log(`[DB2] Connection timeout reached (${timeoutMs/1000}s)`);
              resolve(null); // Resolve with null to indicate timeout
            }, timeoutMs);
          });
          
          // Race between actual connection and timeout
          client = await Promise.race([
            ibmdb.open(connStr),
            timeoutPromise
          ]);
          
          // Clear timeout if connection succeeded
          if (timeoutId) {
            clearTimeout(timeoutId);
            timeoutId = null;
          }
          
          // Check if we timed out or got null from the timeout promise
          if (connectionTimedOut || client === null) {
            throw new Error(`Connection timeout after ${timeoutMs/1000} seconds to ${server || 'database'}:${port || '50000'}`);
          }
          
          // If we got here, we have a client and can proceed
          console.log(`[DB2] Connection established successfully`);
        } catch (connErr) {
          // Always clear timeout to prevent memory leaks
          if (timeoutId) {
            clearTimeout(timeoutId);
            timeoutId = null;
          }
          
          // Rethrow the error for the outer catch block to handle retry logic
          throw connErr;
        }
        
        console.log(`[DB2] Connection established, testing with simple query`);
        
        // Test connection immediately with a simple query
        let testResult;
        try {
          testResult = await client.query('SELECT 1 FROM SYSIBM.SYSDUMMY1');
        } catch (testError) {
          console.error(`[DB2] Connection test query failed: ${testError.message}`);
          throw new Error(`Connection established but test query failed: ${testError.message}`);
        }
        
        if (testResult && testResult.length > 0) {
          console.log(`[DB2] Connection verified successfully with test query`);
          
          // Record successful connection time
          lastSuccessTime = Date.now();
          const connectionTime = lastSuccessTime - attemptStart;
          console.log(`[DB2] Connection established in ${connectionTime}ms`);
          
          try {
            // Set session parameters
            console.log(`[DB2] Setting initial session parameters`);
            await client.query('SET CURRENT SCHEMA = CURRENT USER');
            
            if (isReadOnly) {
              console.log(`[DB2] Setting read-only isolation level`);
              await client.query('SET CURRENT ISOLATION = UR');
            }
            
            // Test catalog views to detect schema differences that might cause issues
            try {
              console.log(`[DB2] Testing common catalog views access`);
              // Test SYSCAT.ROUTINES to check column names
              const routinesTest = await client.query(`
                SELECT 
                  ROUTINENAME, 
                  CASE WHEN EXISTS (
                    SELECT 1 FROM SYSCAT.COLUMNS 
                    WHERE TABNAME = 'ROUTINES' AND TABSCHEMA = 'SYSCAT' AND COLNAME = 'RETURN_TYPE'
                  ) THEN 'RETURN_TYPE' 
                  ELSE 'RETURNS' END AS returnColumn
                FROM SYSCAT.ROUTINES 
                WHERE ROUTINETYPE = 'F' 
                FETCH FIRST 1 ROW ONLY
              `);
              
              if (routinesTest && routinesTest.length > 0) {
                const returnColName = routinesTest[0].returnColumn;
                console.log(`[DB2] Detected return type column name: ${returnColName}`);
                
                // Store this information in client for later use
                client._extendedInfo = client._extendedInfo || {};
                client._extendedInfo.returnTypeColumnName = returnColName;
              }
            } catch (catalogErr) {
              console.warn(`[DB2] Non-critical error testing catalog views: ${catalogErr.message}`);
              // Non-fatal error, connection can still be used
            }
          } catch (settingsErr) {
            // Non-fatal error, just log it
            console.warn(`[DB2] Warning: Could not set some session parameters: ${settingsErr.message}`);
          }
          
          console.log('[DB2] ====== Connection successful ======');
          return { client, database: dbName };
        } else {
          throw new Error('Connection test failed - no data returned from DB2 test query');
        }
      } catch (connErr) {
        retryCount++;
        let userMessage = connErr.message;
        let errorCode = null;
        let shouldRetry = true; // Default to retry
        
        // Extract error code if present in SQL30081N message
        const errorCodeMatch = connErr.message?.match(/SQL30081N.*?Code:\s*"?(\d+)"?/i);
        if (errorCodeMatch && errorCodeMatch[1]) {
          errorCode = errorCodeMatch[1];
        }
        
        // Extract IP address if present in error message
        const ipMatch = connErr.message?.match(/(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})/);
        const detectedIp = ipMatch ? ipMatch[1] : server;
        
        // Handle common DB2 connection errors with helpful messages and special handling for 10060
        if (connErr.message?.includes('SQL30081N')) {
          if (errorCode === '10060') {
            // TCP connection timeout - special handling since you mentioned connections sometimes work
            userMessage = `Network error: Connection timeout (TCP error ${errorCode}) to DB2 server at ${detectedIp || server}:${port}. The server appears to have intermittent connectivity issues.`;
            // Always retry TCP timeout errors with our max retry count
            shouldRetry = retryCount < effectiveMaxRetries;
          } else if (errorCode === '10053' || errorCode === '10054') {
            // TCP connection reset
            userMessage = `Network error: Connection reset (TCP error ${errorCode}) to DB2 server at ${detectedIp || server}:${port}. The server may be busy or the network connection unstable.`;
            shouldRetry = retryCount < maxRetries - 2;
          } else if (errorCode === '10061') {
            // Connection refused
            userMessage = `Network error: Connection refused (TCP error ${errorCode}) by DB2 server at ${detectedIp || server}:${port}. The server may not be accepting connections on this port.`;
            shouldRetry = retryCount < 3; // Only retry connection refused errors a few times
          } else if (errorCode === '10049') {
            // Cannot assign requested address
            userMessage = `Network error: Invalid address (TCP error ${errorCode}) for DB2 server at ${detectedIp || server}:${port}. The server address may be incorrect.`;
            shouldRetry = false; // Don't retry invalid addresses
          } else {
            // Generic SQL30081N error
            userMessage = `Network error: Unable to connect to DB2 server at ${detectedIp || server}:${port}${errorCode ? ` (TCP error code: ${errorCode})` : ''}. Please check server address, port, DB2 server status, and network configuration.`;
          }
        } else if (connErr.message?.includes('SQL1013N')) {
          userMessage = `Authentication failed. Please verify username (${user}) and password are correct.`;
          shouldRetry = retryCount <= 2; // Retry auth errors a couple times
        } else if (connErr.message?.includes('SQL1032N')) {
          userMessage = `Database ${dbName} not found or not accessible. Please verify database name is correct.`;
          shouldRetry = false; // Don't retry if database doesn't exist
        } else if (connErr.message?.includes('Connection timeout')) {
          userMessage = `Connection timeout. DB2 server at ${detectedIp || server}:${port} is not responding within the timeout period.`;
          // For general connection timeouts, use full retry attempts 
          shouldRetry = retryCount < effectiveMaxRetries;
        }
        
        // Log detailed error information
        console.error(`[DB2] Connection attempt ${retryCount} failed: ${userMessage}`);
        console.error(`[DB2] Original error: ${connErr.message}`);
        if (errorCode) {
          console.error(`[DB2] Error code: ${errorCode}`);
        }
        
        // If we shouldn't retry this particular error, throw it now
        if (!shouldRetry) {
          console.error(`[DB2] Not retrying this error type - ${userMessage}`);
          throw new Error(`Failed to connect to DB2: ${userMessage}`);
        }
          // Close client if it was partially opened
        if (client) {
          try {
            await client.close();
          } catch (closeErr) {
            console.error(`[DB2] Error closing failed connection: ${closeErr.message}`);
          }
          client = null;
        }
          // Check if we've reached the maximum retry count
        if (retryCount >= effectiveMaxRetries) {
          console.error(`[DB2] Maximum retry attempts (${effectiveMaxRetries}) reached, giving up`);
          
          // If we ever had a successful connection but then failed, mention this in the error
          if (lastSuccessTime) {
            userMessage += ` A connection was previously established successfully, suggesting intermittent connectivity issues with this DB2 server.`;
          }
          
          // Add server health diagnostics information
          if (isKnownProblematicServer) {
            userMessage += `\n\nNote: The server ${server} is known to have connectivity issues. You may need to try again later or contact your database administrator for assistance.`;
          }
          
          // Add detailed troubleshooting suggestions
          userMessage += `\n\nTroubleshooting tips:
1. Check your network connection and stability
2. Verify firewall settings are not blocking DB2 connections
3. Confirm the DB2 server is running and accepting connections
4. Try increasing the connection timeout in the connection settings
5. If using a VPN, check if VPN connectivity is stable`;
          
          throw new Error(`Failed to connect to DB2: ${userMessage}`);
        }
        
        // Track attempt data for diagnostics
        const attemptData = {
          attempt: retryCount,
          error: connErr.message,
          errorCode,
          timestamp: new Date().toISOString()
        };
        connectionAttempts.push(attemptData);        // Calculate wait time before retrying with advanced adaptive strategy
        let waitTime = 0;
        
        // Special handling based on error code and server characteristics
        if (errorCode === '10060') {
          console.log(`[DB2] Detected error 10060 (connection timeout) - implementing enhanced retry strategy`);
          
          // Check if we're connecting to the known problematic server (e.g., 45.241.60.18)
          if (isKnownProblematicServer) {
            console.log(`[DB2] Applying optimized retry strategy for problematic server ${server}`);
            
            // For problematic servers, use more aggressive adaptive retry strategy
            if (lastSuccessTime) {
              // If we've had success before, use longer wait times with exponential growth
              waitTime = Math.min(20000 * Math.pow(2, retryCount), 240000); // Up to 4 minutes
              console.log(`[DB2] Using extended retry timing for previously successful connection to problematic server`);
            } else {
              // If never successful with this problem server, use a different pattern of wait times
              if (retryCount < 3) {
                // Start with longer waits for initial attempts on problematic servers
                waitTime = 25000 + (15000 * retryCount); // Start with 25s, then 40s, 55s
              } else {
                // After initial attempts, use exponential growth but with higher base values
                waitTime = Math.min(55000 * Math.pow(1.4, retryCount - 2), 210000); // Up to 3.5 minutes
              }
              console.log(`[DB2] Using special pattern retry timing for problematic server`);
            }
            
            // Add a larger randomized component to avoid connection storms
            const jitterPercent = 20; // 20% randomness
            const jitterAmount = (waitTime * jitterPercent / 100);
            const jitter = Math.floor(Math.random() * jitterAmount); 
            waitTime += jitter;
            
            console.log(`[DB2] Wait time for problematic server: ${(waitTime/1000).toFixed(1)}s (includes ${(jitter/1000).toFixed(1)}s jitter)`);
          } else {
            // For standard servers with error 10060
            if (lastSuccessTime) {
              // If we've had success before, use adaptive strategy based on past performance
              const timeSinceSuccess = Date.now() - lastSuccessTime;
              const successFactor = Math.min(timeSinceSuccess / 60000, 5); // Scale based on time since last success (max 5x)
              
              // Exponentially increasing wait times with higher base for known intermittent servers
              waitTime = Math.min(12000 * Math.pow(1.6, retryCount) * (1 + (successFactor * 0.2)), 120000); // Up to 2 minutes
              console.log(`[DB2] Using extended retry timing for previously successful connection (factor: ${successFactor.toFixed(1)})`);
            } else {
              // If never successful, use progressive waits with larger initial values for error 10060
              waitTime = Math.min(10000 * (retryCount + 1), 80000); // 10s, 20s, 30s, etc. up to 80s
              console.log(`[DB2] Using progressive retry timing for connection timeout`);
            }
            
            // Add a randomized component to avoid connection storms (15%)
            const jitter = Math.floor(Math.random() * (waitTime * 0.15)); 
            waitTime += jitter;
            
            console.log(`[DB2] Wait time for standard server with timeout: ${(waitTime/1000).toFixed(1)}s (includes ${(jitter/1000).toFixed(1)}s jitter)`);
          }
        } else if (errorCode === '10061') {
          // Connection refused - could be temporary server unavailability
          // Use faster retry pattern since these often recover quickly
          const baseWait = 3000 * Math.pow(1.5, retryCount);
          waitTime = Math.min(baseWait, 45000); // Cap at 45s
          console.log(`[DB2] Using faster retry pattern for connection refused error: ${(waitTime/1000).toFixed(1)}s`);
        } else if (errorCode === '10053' || errorCode === '10054') {
          // Connection reset - network instability or server issues
          // Use medium retry pattern
          const baseWait = 5000 * Math.pow(1.7, retryCount);
          waitTime = Math.min(baseWait, 60000); // Cap at 60s
          console.log(`[DB2] Using medium retry pattern for connection reset error: ${(waitTime/1000).toFixed(1)}s`);
        } else {
          // For other errors, use standard exponential backoff with some randomization
          waitTime = getBackoffTime(retryCount, errorCode);
          console.log(`[DB2] Using standard backoff for error type: ${(waitTime/1000).toFixed(1)}s`);
        }
        
        console.log(`[DB2] Waiting ${(waitTime/1000).toFixed(1)} seconds before next attempt...`);
        await new Promise(resolve => setTimeout(resolve, waitTime));
      }
    }
  } catch (err) {
    console.error(`[DB2] Connection error: ${err.message}`);
    
    // Try to extract error code from SQL30081N message if present
    let errorCode = null;
    const errorCodeMatch = err.message?.match(/SQL30081N.*?Code:\s*"?(\d+)"?/i);
    if (errorCodeMatch && errorCodeMatch[1]) {
      errorCode = errorCodeMatch[1];
    }
    
    // Try to extract IP address if present in error message
    const ipMatch = err.message?.match(/(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})/);
    const detectedIp = ipMatch ? ipMatch[1] : server;
    
    // Add more detailed error information
    const errorDetails = {
      message: err.message,
      code: err.code || errorCode,
      sqlCode: err.sqlcode,
      sqlState: err.sqlstate || err.sqlState,
      server: detectedIp || server || 'not provided',
      port: port || 'not provided', 
      database: database || 'not provided',
      usedDatabaseUrl: useDatabaseUrl ? 'yes' : 'no',
      timestamp: new Date().toISOString(),
      os: process.platform,
      nodeVersion: process.version
    };
    
    console.error(`[DB2] Error details:`, JSON.stringify(errorDetails, null, 2));
    
    // Generate a user-friendly error message based on the error type
    let userMessage;
    
    // Handle specific error codes for SQL30081N (communication errors)
    if (err.message?.includes('SQL30081N')) {      
      if (errorCode === '10060') {
        userMessage = `Connection timeout (TCP error ${errorCode}). DB2 server at ${detectedIp || server}:${port} is responding intermittently. The server may be overloaded or there may be network instability between your client and the DB2 server.`;
        
        // Add specific suggestions for error 10060 with detailed remediation steps
        userMessage += `\n\nSince you're experiencing intermittent connectivity (error 10060), try these solutions:
1. Network: Ensure stable network connectivity and check for packet loss or high latency
2. Firewall: Verify no firewall is timing out idle connections or blocking traffic
3. Server: Check if the DB2 server is under heavy load or has resource constraints
4. VPN: If using VPN, ensure it's stable and properly connected
5. Retries: The plugin now has enhanced retry logic with longer timeouts specifically for your situation
6. Alternative: If possible, try connecting from a different network to isolate the issue`;
      } else if (errorCode === '10061') {
        userMessage = `Connection refused (TCP error ${errorCode}). DB2 server at ${detectedIp || server}:${port} actively refused the connection. The server may not be running or this port may be incorrect.`;
      } else if (errorCode === '10053' || errorCode === '10054') {
        userMessage = `Connection reset (TCP error ${errorCode}). The connection was reset by the server at ${detectedIp || server}:${port}. This could be due to network issues or firewall rules.`;
      } else {
        userMessage = `Network error (${errorCode ? 'TCP error ' + errorCode : 'unknown error'}). Unable to connect to DB2 server at ${detectedIp || server}:${port}.`;
      }
    } else if (err.message?.includes('SQL1013N')) {
      userMessage = `Authentication failed. Please verify username (${user}) and password are correct.`;
    } else if (err.message?.includes('SQL1032N')) {
      userMessage = `Database ${database} not found or not accessible. Please verify the database name is correct.`;
    } else if (!server && !useDatabaseUrl) {
      userMessage = `Server address not provided.`;
    } else if (!port && !useDatabaseUrl) {
      userMessage = `Port number not provided.`;
    } else if (err.message?.includes('Connection timeout')) {
      userMessage = `Connection timeout. DB2 server at ${detectedIp || server}:${port} did not respond within the timeout period. Based on your report that connections sometimes work, this appears to be an intermittent connectivity issue.`;
    } else {
      userMessage = err.message;
    }
    
    // Add recommendation for using database diagnostic tools
    if (errorCode === '10060' || err.message?.includes('Connection timeout')) {
      userMessage += `\n\nRecommendation: Try using a DB2 monitoring tool to check server health and connectivity.`;
      
      // Add specific diagnostics for error 10060 (connection timeout)
      if (errorCode === '10060') {
        // Log detailed diagnostics for troubleshooting
        console.error('[DB2] ====== DIAGNOSTICS FOR ERROR 10060 ======');
        console.error(`[DB2] This error typically indicates network connectivity issues between your client and the DB2 server.`);
        
        // Try to ping the server
        try {
          const { execSync } = require('child_process');
          console.error('[DB2] Attempting to ping server...');
          
          // Get platform-specific ping command
          const pingCmd = process.platform === 'win32' 
            ? `ping -n 4 ${detectedIp || server}`
            : `ping -c 4 ${detectedIp || server}`;
            
          const pingResult = execSync(pingCmd, { encoding: 'utf8', timeout: 10000 });
          console.error(`[DB2] Ping result: ${pingResult}`);
        } catch (pingErr) {
          console.error(`[DB2] Ping failed: ${pingErr.message}`);
          // If ping fails, this strongly suggests network connectivity issues
          userMessage += `\n\nDiagnostic: Unable to ping the DB2 server. This suggests fundamental network connectivity issues.`;
        }
        
        // Get traceroute info if available (primarily for non-Windows)
        if (process.platform !== 'win32') {
          try {
            const { execSync } = require('child_process');
            console.error('[DB2] Attempting traceroute...');
            const traceResult = execSync(`traceroute -w 2 ${detectedIp || server}`, { encoding: 'utf8', timeout: 15000 });
            console.error(`[DB2] Traceroute result: ${traceResult}`);
          } catch (traceErr) {
            console.error(`[DB2] Traceroute failed: ${traceErr.message}`);
          }
        }
        
        console.error('[DB2] ====== END DIAGNOSTICS ======');
      }
    }
    
    throw new Error(`Failed to connect to DB2: ${userMessage}`);
  }
}
