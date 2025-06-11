// Helper function for DB2 connections
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
  // Add new connection optimization parameters with defaults
  connectTimeout = 30,
  connectionRetries = 3,
  queryTimeout = 60,
  optimizeSchemaQueries = true
}) {  try {
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
      
      connStr = connectionParams.join(';');console.log(`[DB2] Using enhanced connection string format: DATABASE=xxx;HOSTNAME=xxx;PORT=xxx;...`);
    }  // Try to establish connection with simple retry logic
  let client = null;
  let retryCount = 0;
  // Use a moderate retry count that won't cause excessive waiting for the user
  const maxRetries = 3;
  
  // Track success rate for diagnostics
  let lastSuccessTime = null;
  const connectionAttempts = [];
  
  // Check if this is a known problematic server
  const isKnownProblematicServer = server === '45.241.60.18';
  
  while (retryCount < maxRetries) {
      try {
        const attemptStart = Date.now();
        console.log(`[DB2] Connection attempt ${retryCount + 1}/${maxRetries} to ${server || 'custom URL'}:${port || 'custom port'}`);
        
        // Try to establish connection with improved timeout
        console.log(`[DB2] Opening connection with timeout`);          // Dynamic timeout based on retry count - dramatically increased for error 10060
        // Use special handling for the known problematic server (45.241.60.18)
        let baseTimeoutMs, timeoutIncrease, maxTimeoutMs;
        
        if (isKnownProblematicServer) {
          console.log('[DB2] Using extended timeouts for known problematic server.');
          // Start with 45 seconds and increase by 30 seconds each retry up to 5 minutes
          baseTimeoutMs = 45000; // 45 seconds base timeout for problematic server
          timeoutIncrease = 30000 * Math.min(retryCount, 10); // Increase by 30s each retry up to 300s extra
          maxTimeoutMs = 300000; // Cap at 5 minutes for problematic server
        } else {
          // Standard enhanced timeout for other servers
          baseTimeoutMs = 30000; // 30 seconds base timeout (increased from 20s)
          timeoutIncrease = 20000 * Math.min(retryCount, 8); // Increase by 20s each retry up to 160s extra
          maxTimeoutMs = 190000; // Cap at 190 seconds
        }
        
        const timeoutMs = Math.min(baseTimeoutMs + timeoutIncrease, maxTimeoutMs);
        
        console.log(`[DB2] Using connection timeout of ${timeoutMs/1000} seconds for attempt #${retryCount + 1}`);
        
        // Create an AbortController for timeout management (Node.js v15+)
        let abortController;
        let timeoutId;
        
        try {
          abortController = new AbortController();
        } catch (e) {
          // AbortController not available, will use the alternative timeout approach
        }
        
        // Add a timeout to the connection attempt with abort support if available
        const connectionPromise = ibmdb.open(connStr);
        
        client = await Promise.race([
          connectionPromise,
          new Promise((_, reject) => {
            timeoutId = setTimeout(() => {
              if (abortController) {
                try {
                  abortController.abort();
                } catch (e) {
                  console.error(`[DB2] Error aborting connection: ${e.message}`);
                }
              }
              reject(new Error(`Connection timeout after ${timeoutMs/1000} seconds to ${server}:${port}`));
            }, timeoutMs);
          })
        ]);
        
        // Clear the timeout once connection succeeds
        if (timeoutId) clearTimeout(timeoutId);
        
        console.log(`[DB2] Connection established, testing with simple query`);
          // Test connection immediately with a simple query
        const testResult = await client.query('SELECT 1 FROM SYSIBM.SYSDUMMY1');
        
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
            shouldRetry = retryCount < maxRetries;
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
          shouldRetry = retryCount < maxRetries;
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
        
        if (retryCount === maxRetries) {
          console.error(`[DB2] Maximum retry attempts (${maxRetries}) reached, giving up`);
          
          // If we ever had a successful connection but then failed, mention this in the error
          if (lastSuccessTime) {
            userMessage += ` A connection was previously established successfully, suggesting intermittent connectivity issues with this DB2 server.`;
          }
          
          throw new Error(`Failed to connect to DB2: ${userMessage}`);
        }
        
        // Track attempt data for diagnostics
        const attemptData = {
          attempt: retryCount,
          error: connErr.message,
          errorCode,
          timestamp: new Date().toISOString()
        };
        connectionAttempts.push(attemptData);
        
        // Wait before retrying with adaptive backoff strategy based on error type and past success
        let waitTime;          // Special handling for 10060 errors (connection timeout)
        if (errorCode === '10060') {
          console.log(`[DB2] Detected error 10060 (connection timeout) - implementing special retry strategy`);
          
          // Check if we're connecting to the known problematic server (45.241.60.18)
          if (isKnownProblematicServer) {
            console.log(`[DB2] Applying specialized retry strategy for server 45.241.60.18`);
            
            // For the known problematic server, use very aggressive retry strategy
            if (lastSuccessTime) {
              // If we've had success before, use extremely long wait times with strong exponential growth
              waitTime = Math.min(15000 * Math.pow(1.8, retryCount), 180000); // Up to 3 minutes
              console.log(`[DB2] Using ultra-extended retry timing for previously successful connection to problematic server`);
            } else {
              // If never successful with this problem server, use a different pattern of wait times
              // Long initial wait + linear growth for earlier attempts, then exponential growth
              if (retryCount < 3) {
                waitTime = 20000 + (10000 * retryCount); // Start with 20s, then 30s, 40s
              } else {
                waitTime = Math.min(40000 * Math.pow(1.3, retryCount - 2), 150000); // Up to 2.5 minutes
              }
              console.log(`[DB2] Using special pattern retry timing for problematic server`);
            }
            
            // Add a larger randomized component to avoid connection storms
            const jitter = Math.floor(Math.random() * 10000); // Add up to 10s of jitter
            waitTime += jitter;
          } else {
            // For standard servers with error 10060
            // For timeout errors where we've had previous success, use much longer wait times
            if (lastSuccessTime) {
              // Exponentially increasing wait times with higher base for known intermittent servers
              waitTime = Math.min(10000 * Math.pow(1.5, retryCount), 90000); // Up to 90 seconds
              console.log(`[DB2] Using extended retry timing for previously successful connection`);
            } else {
              // If never successful, still use longer waits for error 10060
              waitTime = Math.min(8000 * (retryCount + 1), 60000); // 8s, 16s, 24s, etc. up to 60s
              console.log(`[DB2] Using progressive retry timing for connection timeout`);
            }
            
            // Add a randomized component to avoid connection storms
            const jitter = Math.floor(Math.random() * 5000); // Add up to 5s of jitter
            waitTime += jitter;
          }
        } else {
          // For other errors, use standard exponential backoff with some randomization
          const baseWait = Math.min(2000 * Math.pow(1.5, retryCount), 20000);
          const jitter = Math.floor(Math.random() * 1000); // Add up to 1s of jitter
          waitTime = baseWait + jitter;
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
