// Debug network requests for dbGate DB2 plugin

// Initialize the required global packages first
global.DBGATE_PACKAGES = {
  'dbgate-tools': require('dbgate-tools'),
  'dbgate-sqltree': require('dbgate-sqltree'),
};

const driver = require('./src/backend/driver');
const connectHelper = require('./src/backend/connect-fixed');

async function testNetworkRequests() {
  console.log('=== DB2 API Network Debugging Tool ===');
  
  // Add global debug interceptors for better network visibility
  const originalFetch = global.fetch;
  if (originalFetch) {
    console.log('Intercepting fetch API calls...');
    global.fetch = function(url, options) {
      console.log(`[NETWORK] Fetch call to: ${url}`);
      console.log(`[NETWORK] Options:`, options);
      return originalFetch(url, options).then(response => {
        console.log(`[NETWORK] Response from: ${url}, status: ${response.status}`);
        return response;
      }).catch(err => {
        console.error(`[NETWORK] Error for ${url}:`, err);
        throw err;
      });
    };
  } else {
    console.log('fetch API not available for monitoring');
  }
  
  try {
    // Initialize the driver and make sure API methods are properly registered
    driver.initialize();
    
    // Check required methods for API endpoints
    const requiredMethods = ['getVersion', 'listSchemas', 'getStructure', 'close'];
    const missingMethods = [];
    
    for (const method of requiredMethods) {
      if (typeof driver[method] !== 'function') {
        missingMethods.push(method);
      }
    }
    
    if (missingMethods.length > 0) {
      throw new Error(`Missing required API methods: ${missingMethods.join(', ')}`);
    }

    // Connection details - replace with valid credentials to test
    const connection = {
      server: 'localhost',
      port: 50000,
      user: 'db2inst1',
      password: 'password',
      database: 'SAMPLE',
      engine: 'db2@dbgate-plugin-db2',
      useSsl: false
    };
    
    // Test API endpoint methods directly
    console.log('\n=== Testing API endpoints directly ===');
    
    try {
      console.log('Connecting to DB2...');
      const dbhan = await connectHelper.connect(connection);
      console.log('Connected successfully');
      
      // Manually trigger network activity
      console.log('\n--- Testing getVersion ---');
      console.time('getVersion');
      const version = await driver.getVersion(dbhan);
      console.timeEnd('getVersion');
      console.log('Version:', version);
      
      console.log('\n--- Testing listSchemas ---');
      console.time('listSchemas');
      const schemas = await driver.listSchemas(dbhan, 'test-conid', connection.database);
      console.timeEnd('listSchemas');
      console.log(`Found ${schemas.length} schemas`);
      
      if (schemas.length > 0) {
        const testSchema = schemas[0].name;
        console.log(`\n--- Testing getStructure for schema: ${testSchema} ---`);
        console.time('getStructure');
        const structure = await driver.getStructure(dbhan, testSchema);
        console.timeEnd('getStructure');
        console.log('Structure statistics:');
        console.log(`- Tables: ${structure.tables.length}`);
        console.log(`- Views: ${structure.views.length}`);
        console.log(`- Functions: ${structure.functions.length}`);
        console.log(`- Procedures: ${structure.procedures.length}`);
      }
      
      console.log('\nClosing connection...');
      await driver.close(dbhan);
      console.log('Connection closed');
      
    } catch (connErr) {
      console.error('Connection error:', connErr);
      console.log('Since connection failed, simulating mock API calls to check for network activity...');
      
      // Simulate API endpoint calls with mock data
      const mockDbhan = { client: { query: () => ({ rows: [] }) } };
      
      console.log('\n--- Simulating getVersion (mocked) ---');
      try {
        await driver.getVersion(mockDbhan);
        console.log('Mock getVersion completed');
      } catch (err) {
        console.error('Mock getVersion failed:', err.message);
      }
      
      console.log('\n--- Simulating listSchemas (mocked) ---');
      try {
        await driver.listSchemas(mockDbhan, 'test-conid', 'SAMPLE');
        console.log('Mock listSchemas completed');
      } catch (err) {
        console.error('Mock listSchemas failed:', err.message);
      }
      
      console.log('\n--- Simulating getStructure (mocked) ---');
      try {
        await driver.getStructure(mockDbhan, 'DB2INST1');
        console.log('Mock getStructure completed');
      } catch (err) {
        console.error('Mock getStructure failed:', err.message);
      }
    }
  } catch (err) {
    console.error('Error during API endpoint testing:', err);
  }
  
  console.log('\n=== Network Debug Testing Complete ===');
}

// Run the test
testNetworkRequests().catch(err => {
  console.error('Unhandled error:', err);
});
