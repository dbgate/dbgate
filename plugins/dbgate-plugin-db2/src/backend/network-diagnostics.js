// Helper functions for network diagnostics and connectivity assessment
const { execSync } = require('child_process');
const net = require('net');

/**
 * Performs comprehensive network diagnostics for DB2 connections
 * @param {string} server - Server address to check
 * @param {number} port - Port to check
 * @returns {Promise<{isHealthy: boolean, latency: number, packetLoss: number, details: object}>} - Network diagnostic results
 */
async function assessNetworkReliability(server, port) {
  if (!server) {
    return { 
      isHealthy: false, 
      latency: -1, 
      packetLoss: 100,
      details: { error: 'No server address provided' } 
    };
  }
  
  console.log(`[DB2] Performing network reliability assessment for ${server}:${port}`);
  
  const results = {
    isHealthy: false,
    latency: -1,
    packetLoss: 0,
    details: {
      pingResults: null,
      socketTest: null,
      traceroute: null,
      timestamps: {
        started: new Date().toISOString(),
        completed: null
      }
    }
  };
  
  try {
    // First, try a basic socket connection to check immediate connectivity
    const socketResult = await performSocketTest(server, port);
    results.details.socketTest = socketResult;
    
    // If socket test failed completely, network might be down
    if (!socketResult.isReachable) {
      results.isHealthy = false;
      results.latency = -1;
      results.packetLoss = 100; // Assume 100% packet loss
      console.log(`[DB2] Socket test failed completely for ${server}:${port}`);
    } else {
      // Socket test was successful, store the latency
      results.latency = socketResult.latency;
      
      // Try to ping the server to check for packet loss
      try {
        const pingResult = await performPingTest(server);
        results.details.pingResults = pingResult;
        results.packetLoss = pingResult.packetLoss;
        
        // For high latency or packet loss, mark network as unhealthy
        results.isHealthy = pingResult.packetLoss < 20 && pingResult.avgLatency < 500;
      } catch (pingErr) {
        console.log(`[DB2] Ping test failed for ${server}: ${pingErr.message}`);
        results.details.pingResults = { error: pingErr.message };
        
        // If ping failed but socket worked, assume network is moderately reliable
        results.isHealthy = socketResult.latency < 300;
        results.packetLoss = 50; // Assume 50% packet loss if ping fails
      }
    }
    
    // Try traceroute for additional diagnostics if network issues detected
    if (!results.isHealthy) {
      try {
        const traceResult = await performTraceroute(server);
        results.details.traceroute = traceResult;
      } catch (traceErr) {
        console.log(`[DB2] Traceroute failed for ${server}: ${traceErr.message}`);
        results.details.traceroute = { error: traceErr.message };
      }
    }
  } catch (err) {
    console.error(`[DB2] Network assessment failed: ${err.message}`);
    results.isHealthy = false;
    results.latency = -1;
    results.packetLoss = 100;
    results.details.error = err.message;
  }
  
  results.details.timestamps.completed = new Date().toISOString();
  
  console.log(`[DB2] Network assessment results for ${server}:${port}`);
  console.log(`[DB2] - Health: ${results.isHealthy ? 'HEALTHY' : 'UNHEALTHY'}`);
  console.log(`[DB2] - Latency: ${results.latency >= 0 ? results.latency + 'ms' : 'Unknown'}`);
  console.log(`[DB2] - Packet Loss: ${results.packetLoss}%`);
  
  return results;
}

/**
 * Performs a socket connection test to check immediate connectivity
 * @param {string} server - Server address
 * @param {number} port - Port number
 * @returns {Promise<{isReachable: boolean, latency: number, message: string}>} - Socket test results
 */
async function performSocketTest(server, port) {
  return new Promise(resolve => {
    const socket = new net.Socket();
    let resolved = false;
    const startTime = Date.now();
    
    // Set timeout for the connection test (5 seconds)
    socket.setTimeout(5000);
    
    socket.on('connect', () => {
      const latency = Date.now() - startTime;
      socket.destroy();
      
      if (!resolved) {
        resolved = true;
        resolve({ 
          isReachable: true, 
          latency,
          message: `Socket connection successful, latency: ${latency}ms`
        });
      }
    });
    
    socket.on('timeout', () => {
      socket.destroy();
      
      if (!resolved) {
        resolved = true;
        resolve({ 
          isReachable: false, 
          latency: -1,
          message: 'Socket connection timed out'
        });
      }
    });
    
    socket.on('error', (error) => {
      if (!resolved) {
        resolved = true;
        resolve({ 
          isReachable: false, 
          latency: -1,
          message: `Socket connection error: ${error.message}`
        });
      }
    });
    
    // Connect to the server
    socket.connect(port, server);
  });
}

/**
 * Performs a ping test to check packet loss and latency
 * @param {string} server - Server address
 * @returns {Promise<{success: boolean, packetLoss: number, avgLatency: number, rawOutput: string}>} - Ping results
 */
async function performPingTest(server) {
  return new Promise((resolve, reject) => {
    try {
      // Get platform-specific ping command
      const pingCmd = process.platform === 'win32' 
        ? `ping -n 4 ${server}`
        : `ping -c 4 ${server}`;
      
      const pingOutput = execSync(pingCmd, { encoding: 'utf8', timeout: 10000 });
      
      // Parse ping output
      const result = {
        success: true,
        packetLoss: 0,
        avgLatency: 0,
        rawOutput: pingOutput
      };
      
      // Extract packet loss
      const lossMatch = pingOutput.match(/(\d+)% (?:packet )?loss/);
      if (lossMatch && lossMatch[1]) {
        result.packetLoss = parseInt(lossMatch[1], 10);
      }
      
      // Extract average latency
      const latencyMatch = pingOutput.match(/(?:Average|Minimum) = (\d+)(?:ms)?/i);
      if (latencyMatch && latencyMatch[1]) {
        result.avgLatency = parseInt(latencyMatch[1], 10);
      }
      
      resolve(result);
    } catch (err) {
      // Don't reject, just return an error result
      resolve({
        success: false,
        packetLoss: 100,
        avgLatency: -1,
        rawOutput: err.message,
        error: err.message
      });
    }
  });
}

/**
 * Performs a traceroute to check network path
 * @param {string} server - Server address
 * @returns {Promise<{success: boolean, hops: number, rawOutput: string}>} - Traceroute results
 */
async function performTraceroute(server) {
  return new Promise((resolve, reject) => {
    try {
      // Skip traceroute on Windows as it's slow and often blocked
      if (process.platform === 'win32') {
        resolve({
          success: false,
          hops: 0,
          rawOutput: 'Traceroute skipped on Windows platform',
          skipped: true
        });
        return;
      }
      
      const traceCmd = `traceroute -w 2 -m 15 ${server}`;
      
      const traceOutput = execSync(traceCmd, { encoding: 'utf8', timeout: 15000 });
      
      // Count hops by counting lines with hop numbers
      const hopLines = traceOutput.split('\n').filter(line => /^\s*\d+\s+/.test(line));
      
      resolve({
        success: true,
        hops: hopLines.length,
        rawOutput: traceOutput
      });
    } catch (err) {
      // Don't reject, just return an error result
      resolve({
        success: false,
        hops: 0,
        rawOutput: err.message,
        error: err.message
      });
    }
  });
}

/**
 * Check if a server is considered problematic based on its address patterns
 * @param {string} server - Server address to check
 * @returns {boolean} - True if server is identified as potentially problematic
 */
function isProblematicServer(server) {
  if (!server) return false;
  
  // List of known problematic server patterns
  const problematicPatterns = [
    // Specific IPs
    '45.241.60.18',
    '45.241.60.19',
    // IP ranges (as prefixes)
    '45.241.60.',
    '103.21.244.',
    // Example domain patterns (add real ones as needed)
    'slowdb.example.com'
  ];
  
  // Check if server matches any problematic pattern
  return problematicPatterns.some(pattern => {
    if (pattern.endsWith('.')) {
      // It's an IP prefix
      return server.startsWith(pattern);
    } else {
      // It's an exact match
      return server === pattern;
    }
  });
}

module.exports = {
  assessNetworkReliability,
  performSocketTest,
  performPingTest,
  performTraceroute,
  isProblematicServer
};
