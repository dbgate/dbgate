// Test script for enhanced DB2 connection system
// Tests the connection retry logic and server health monitoring

const ibmdb = require('ibm_db');
const connectHelper = require('./connect-fixed');
const serverHealthMonitor = require('./server-health');
const networkDiagnostics = require('./network-diagnostics');
const ConnectionManager = require('./connection-manager');

let connectionManager;

/**
 * Simulates a connection to a DB2 server
 * @param {string} server - Server address
 * @param {number} port - Port number
 * @param {string} database - Database name
 * @param {string} user - Username
 * @param {string} password - Password
 * @param {number} maxRetries - Maximum number of retries
 * @returns {Promise<object>} - Connection result
 */
async function testConnection(server, port, database, user, password, maxRetries = 3) {
  console.log(`\n[TEST] Attempting connection to ${server}:${port}/${database} with ${maxRetries} max retries`);

  try {
    // First check if this is a known problematic server
    if (serverHealthMonitor.isServerProblematic(server)) {
      console.log(`[TEST] Server ${server} is flagged as problematic, using enhanced connection strategy`);
    }

    // Get server health recommendations before connection
    const healthRecommendations = serverHealthMonitor.getConnectionRecommendations(server, port);
    console.log(`[TEST] Server health recommendations:`, healthRecommendations);

    // Run network diagnostics before attempting connection
    const networkHealth = await networkDiagnostics.performSocketTest(server, port);
    console.log(`[TEST] Network health: ${networkHealth.isReachable ? 'REACHABLE' : 'UNREACHABLE'} (${networkHealth.latency}ms)`);

    // Use enhanced connection parameters based on server health
    const effectiveMaxRetries = healthRecommendations.recommendedMaxRetries || maxRetries;
    const timeout = healthRecommendations.recommendedTimeout || 15000;
    
    const connectionString = `DATABASE=${database};HOSTNAME=${server};PORT=${port};PROTOCOL=TCPIP;UID=${user};PWD=${password}`;
    console.log(`[TEST] Using effective max retries: ${effectiveMaxRetries} and timeout: ${timeout}ms`);

    const startTime = Date.now();
    
    // Use our enhanced connect function with adaptive retry logic
    const conn = await connectHelper.connectWithRetryAndDiagnostics({
      connectionString,
      server,
      port,
      database,
      user,
      password,
      effectiveMaxRetries,
      timeout
    });

    const connectionTime = Date.now() - startTime;
    console.log(`[TEST] Connection successful after ${connectionTime}ms`);
    
    // Record successful connection in health monitor
    serverHealthMonitor.recordSuccessfulConnection(server, port, connectionTime);
    
    // Test running a simple query
    const data = await new Promise((resolve, reject) => {
      conn.query('SELECT 1 FROM SYSIBM.SYSDUMMY1', (err, data) => {
        if (err) reject(err);
        else resolve(data);
      });
    });
    
    console.log(`[TEST] Query executed successfully:`, data);
    
    // Close the connection
    conn.close();
    console.log(`[TEST] Connection closed`);
    
    return { success: true, connectionTime, data };
  } catch (error) {
    console.error(`[TEST] Connection failed: ${error.message}`);
    
    // Record connection failure in health monitor
    serverHealthMonitor.recordFailedConnection(server, port, error.message);
    
    return { 
      success: false, 
      error: error.message,
      diagnostics: error.diagnostics || {}
    };
  }
}

/**
 * Run a series of tests on different servers
 */
async function runTestSuite() {
  // Initialize connection manager
  connectionManager = new ConnectionManager();

  console.log('\n======= DB2 CONNECTION TEST SUITE =======');
  console.log('Testing enhanced connection system with problematic servers');

  // Test configuration
  const testCases = [
    // Test case 1: Normal server (replace with a working server in your environment)
    {
      name: 'Normal Server',
      server: 'localhost',
      port: 50000,
      database: 'testdb',
      user: 'db2admin',
      password: 'password',
      maxRetries: 3
    },
    // Test case 2: Known problematic server 1
    {
      name: 'Problematic Server 1',
      server: '45.241.60.18',
      port: 50000,
      database: 'testdb',
      user: 'db2admin',
      password: 'password',
      maxRetries: 5
    },
    // Test case 3: Known problematic server 2
    {
      name: 'Problematic Server 2',
      server: '45.241.60.19',
      port: 50000,
      database: 'testdb',
      user: 'db2admin',
      password: 'password',
      maxRetries: 5
    }
  ];

  // Run each test case
  for (const testCase of testCases) {
    console.log(`\n===== Testing ${testCase.name} =====`);
    try {
      const result = await testConnection(
        testCase.server, 
        testCase.port, 
        testCase.database,
        testCase.user,
        testCase.password,
        testCase.maxRetries
      );
      
      if (result.success) {
        console.log(`[TEST] Test case "${testCase.name}" passed (${result.connectionTime}ms)`);
      } else {
        console.log(`[TEST] Test case "${testCase.name}" failed: ${result.error}`);
        if (result.diagnostics) {
          console.log('[TEST] Diagnostics:', JSON.stringify(result.diagnostics, null, 2));
        }
      }
    } catch (e) {
      console.error(`[TEST] Unexpected error in test case "${testCase.name}":`, e);
    }
  }

  // Display server health statistics after all tests
  console.log('\n===== Server Health Statistics =====');
  serverHealthMonitor.logServerHealthStats();
}

// Run the tests
runTestSuite().then(() => {
  console.log('\n======= TEST SUITE COMPLETED =======');
}).catch(err => {
  console.error('Error running test suite:', err);
});
