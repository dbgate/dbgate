// DB2 Plugin Server-Side Debug Tool
// This script adds enhanced debugging to the backend of the DB2 plugin

console.log("=== DB2 Plugin Server-Side Debug Tool ===");

const fs = require('fs');
const path = require('path');
const util = require('util');

// Path to the driver file that needs to be monitored
const driverPath = path.join(__dirname, 'src', 'backend', 'driver.js');
const fixedStructurePath = path.join(__dirname, 'src', 'backend', 'fixed-structure.js');

// Create a debug log file
const logFile = path.join(__dirname, 'db2-debug.log');
console.log(`Creating debug log file: ${logFile}`);

// Enable server-side logging setup
function setupServerLogging() {
  const originalLog = console.log;
  const originalError = console.error;
  
  // Function to write to debug file
  function writeToDebugFile(level, ...args) {
    try {
      const timestamp = new Date().toISOString();
      const message = args.map(arg => {
        if (typeof arg === 'object' && arg !== null) {
          return util.inspect(arg, { depth: 5, colors: false });
        }
        return String(arg);
      }).join(' ');
      
      const logLine = `[${timestamp}] [${level}] ${message}\n`;
      fs.appendFileSync(logFile, logLine);
    } catch (err) {
      // Don't fail if logging fails
    }
  }
  
  // Override console.log
  console.log = function(...args) {
    // Only intercept DB2 related logs
    if (args.length > 0 && typeof args[0] === 'string' && args[0].includes('DB2')) {
      writeToDebugFile('INFO', ...args);
    }
    originalLog.apply(console, args);
  };
  
  // Override console.error
  console.error = function(...args) {
    // Intercept all errors
    writeToDebugFile('ERROR', ...args);
    originalError.apply(console, args);
  };
  
  console.log('[DB2] Server-side logging enabled');
  writeToDebugFile('INFO', 'DB2 server-side debug logging started');
}

// Function to add debug to driver API endpoints
async function injectDriverDebug() {
  try {
    // Add driver message
    console.log('[DB2] Injecting debug code into driver');
    
    // Create a function to test driver API endpoints
    const testDriverEndpoints = async function(driver) {
      console.log('[DB2] Testing driver endpoints');
      
      // Get the list of methods from the driver
      const driverMethods = Object.keys(driver).filter(
        key => typeof driver[key] === 'function'
      );
      
      console.log('[DB2] Available driver methods:', driverMethods);
      
      // Key API methods to check
      const criticalMethods = ['getStructure', 'listSchemas', 'getVersion'];
      
      for (const method of criticalMethods) {
        if (driverMethods.includes(method)) {
          console.log(`[DB2] Critical method ${method} is present in driver`);
        } else {
          console.error(`[DB2] CRITICAL ERROR: Method ${method} is MISSING from driver`);
        }
      }
      
      // Check if driver extends DatabaseAnalyser
      if (driver.analyserClass) {
        console.log('[DB2] Driver has analyserClass:', driver.analyserClass.name);
      } else {
        console.error('[DB2] Driver is missing analyserClass');
      }
    };
    
    // Create a runnable script that checks implementations
    fs.writeFileSync(
      path.join(__dirname, 'driver-verification.js'),
      `
// DB2 Driver Verification Script
const driver = require('./src/backend/driver');

console.log('Starting DB2 driver verification');

// Check if the driver has all required methods
const requiredMethods = ['getStructure', 'listSchemas', 'getVersion'];
const missingMethods = requiredMethods.filter(method => !driver[method]);

if (missingMethods.length > 0) {
  console.error('ERROR: The following required methods are missing:', missingMethods);
} else {
  console.log('All required methods are present in the driver');
}

// Add extra logging to trace driver API execution
const originalGetStructure = driver.getStructure;
driver.getStructure = async function(dbhan, schemaName) {
  console.log('\\n====== TRACING getStructure CALL =======');
  console.log('Arguments:', { schemaName });
  try {
    const result = await originalGetStructure.call(this, dbhan, schemaName);
    console.log('Structure result summary:');
    if (result) {
      console.log('- Tables:', result.tables?.length || 0);
      console.log('- Views:', result.views?.length || 0);
      console.log('- Functions:', result.functions?.length || 0);
      console.log('- Procedures:', result.procedures?.length || 0);
      
      // Print first few items as examples
      if (result.tables?.length > 0) {
        console.log('Example table:', result.tables[0]);
      }
    } else {
      console.log('No structure result returned');
    }
    console.log('====== END TRACING getStructure CALL =======\\n');
    return result;
  } catch (error) {
    console.error('Error in getStructure:', error);
    console.log('====== END TRACING getStructure CALL (ERROR) =======\\n');
    throw error;
  }
};

console.log('Driver verification complete - enhanced tracing enabled');
`
    );
    
    console.log('[DB2] Created driver verification script: driver-verification.js');
    console.log('[DB2] Run with: node driver-verification.js');
  } catch (error) {
    console.error('[DB2] Error injecting debug code:', error);
  }
}

// Create a utility to directly call DB2 APIs
function createApiTester() {
  // Create an API test script for direct calling
  fs.writeFileSync(
    path.join(__dirname, 'test-api-direct.js'),
    `
// DB2 Direct API Test Script
const driver = require('./src/backend/driver');
const ibmdb = require('ibm_db');

// Default connection parameters - replace with your own
const CONNECTION_CONFIG = {
  server: 'localhost',
  port: 50000,
  database: 'testdb',
  user: 'db2inst1',
  password: 'password',
  schema: 'DB2INST1'
};

async function testDirectApi() {
  console.log('Starting direct DB2 API testing');
  console.log('Using connection config:', CONNECTION_CONFIG);
  
  let connection;
  try {
    // Create connection string
    const connectionString = 
      "DRIVER={DB2};DATABASE=" + CONNECTION_CONFIG.database + 
      ";HOSTNAME=" + CONNECTION_CONFIG.server + 
      ";UID=" + CONNECTION_CONFIG.user + 
      ";PWD=" + CONNECTION_CONFIG.password + 
      ";PORT=" + CONNECTION_CONFIG.port + 
      ";PROTOCOL=TCPIP";
    
    console.log('Connecting to DB2 with connection string:', connectionString);
    
    // Open connection
    connection = await new Promise((resolve, reject) => {
      try {
        const conn = ibmdb.openSync(connectionString);
        console.log('Connection successful');
        resolve(conn);
      } catch (error) {
        console.error('Connection error:', error);
        reject(error);
      }
    });
    
    // Get schema list
    console.log('\\nTesting listSchemas API...');
    const schemas = await driver.listSchemas(connection);
    console.log('Schemas found:', schemas);
    
    if (schemas && schemas.length > 0) {
      // Use first schema or predefined schema
      const testSchema = CONNECTION_CONFIG.schema || schemas[0];
      console.log('\\nUsing schema:', testSchema);
      
      // Test getStructure API
      console.log('\\nTesting getStructure API...');
      const structure = await driver.getStructure(connection, testSchema);
      console.log('Structure results:');
      console.log('- Tables:', structure.tables?.length || 0);
      console.log('- Views:', structure.views?.length || 0);
      console.log('- Functions:', structure.functions?.length || 0);
      console.log('- Procedures:', structure.procedures?.length || 0);
      
      // Print examples
      if (structure.tables?.length > 0) {
        console.log('\\nExample table:', structure.tables[0]);
      }
      
      if (structure.views?.length > 0) {
        console.log('\\nExample view:', structure.views[0]);
      }
    } else {
      console.log('No schemas found, cannot test getStructure');
    }
    
  } catch (error) {
    console.error('Test failed with error:', error);
  } finally {
    // Close connection
    if (connection) {
      try {
        connection.closeSync();
        console.log('Connection closed');
      } catch (err) {
        console.error('Error closing connection:', err);
      }
    }
  }
}

// Run the test
testDirectApi().then(() => {
  console.log('\\nDirect API testing complete');
}).catch(err => {
  console.error('\\nDirect API testing failed:', err);
});
`
  );
  
  console.log('[DB2] Created API test script: test-api-direct.js');
  console.log('[DB2] Edit connection details and run with: node test-api-direct.js');
}

// Create a web API test script to emulate the frontend calling the server
function createWebApiTester() {
  fs.writeFileSync(
    path.join(__dirname, 'simulate-web-api.js'),
    `
// DB2 Web API Simulation Script
// This script simulates the frontend calling the server API

const axios = require('axios');

// Configuration - change these to match your setup
const API_URL = 'http://localhost:3000';  // Default for local dev server
const CONNECTION_ID = 'YOUR_CONNECTION_ID'; // Replace with your DB2 connection ID
const DATABASE = 'YOUR_DATABASE';         // Replace with your DB2 database name

async function simulateWebApiCalls() {
  console.log('Simulating web API calls to DB2 plugin');
  
  try {
    // 1. Test server version API
    console.log('\\nTesting server version API...');
    const versionResponse = await axios.post(
      API_URL + '/api/database-connections/server-version',
      { conid: CONNECTION_ID, database: DATABASE }
    );
    console.log('Version API response:', versionResponse.data);
    
    // 2. Test schema list API
    console.log('\\nTesting schema list API...');
    const schemaResponse = await axios.post(
      API_URL + '/api/database-connections/schema-list', 
      { conid: CONNECTION_ID, database: DATABASE }
    );
    console.log('Schema list API response:', schemaResponse.data);
    
    // Get first schema for structure test
    const schemas = schemaResponse.data;
    if (schemas && schemas.length > 0) {
      const testSchema = schemas[0];
      console.log('\\nUsing schema for structure test:', testSchema);
      
      // 3. Test structure API
      console.log('\\nTesting structure API...');
      const structureResponse = await axios.post(
        API_URL + '/api/database-connections/structure',
        { conid: CONNECTION_ID, database: DATABASE, schemaName: testSchema }
      );
      
      const structure = structureResponse.data;
      console.log('Structure API response summary:');
      console.log('- Tables:', structure?.tables?.length || 0);
      console.log('- Views:', structure?.views?.length || 0);
      console.log('- Functions:', structure?.functions?.length || 0);
      console.log('- Procedures:', structure?.procedures?.length || 0);
      
      // Show example objects if available
      if (structure?.tables?.length > 0) {
        console.log('\\nExample table:', structure.tables[0]);
      }
    } else {
      console.log('No schemas found, cannot test structure API');
    }
    
  } catch (error) {
    console.error('API simulation failed:', error.message);
    if (error.response) {
      console.error('Response data:', error.response.data);
      console.error('Response status:', error.response.status);
    }
  }
}

// Run the simulation
console.log('\\n=== DB2 Web API Simulation ===');
console.log('API URL:', API_URL);
console.log('Connection ID:', CONNECTION_ID);
console.log('Database:', DATABASE);
console.log('\\nNOTE: You must update the connection ID and database in this script');
console.log('\\nMake sure the DbGate server is running before executing this script');

if (CONNECTION_ID === 'YOUR_CONNECTION_ID' || DATABASE === 'YOUR_DATABASE') {
  console.error('\\nERROR: You must update the CONNECTION_ID and DATABASE variables in the script before running');
} else {
  simulateWebApiCalls().then(() => {
    console.log('\\nAPI simulation complete');
  });
}
`
  );
  
  console.log('[DB2] Created web API test script: simulate-web-api.js');
  console.log('[DB2] Edit connection details and run with: node simulate-web-api.js');
}

// Run all the debug setup functions
async function main() {
  try {
    // Set up console logging to file
    setupServerLogging();
    
    // Inject debug code into driver
    await injectDriverDebug();
    
    // Create API testers
    createApiTester();
    createWebApiTester();
    
    console.log('[DB2] Debug tools setup complete!');
    console.log('[DB2] Available debug scripts:');
    console.log('  - driver-verification.js: Verifies driver API methods');
    console.log('  - test-api-direct.js: Tests driver APIs directly');
    console.log('  - simulate-web-api.js: Simulates web API calls');
    console.log('[DB2] Debug logs will be written to:', logFile);
    
    // Create execution instructions
    console.log('\nTo debug the DB2 plugin, follow these steps:');
    console.log('1. Run `node driver-verification.js` to verify driver methods');
    console.log('2. Update connection details in test-api-direct.js and run it');
    console.log('3. Start DbGate and use the browser debug script');
    console.log('4. Check db2-debug.log for detailed server-side logs');
  } catch (error) {
    console.error('[DB2] Error setting up debug tools:', error);
  }
}

// Run the main function
main();
