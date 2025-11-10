// DB2 API Flow Verification
// This script simulates the API flow that occurs when a user expands a DB2 connection in the UI
// It helps identify where the chain of API calls might be breaking

const ibmdb = require('ibm_db');
const driver = require('./src/backend/driver');
const util = require('util');

// CONNECTION SETTINGS - Update these with your DB2 connection details
const CONNECTION = {
  server: 'localhost', 
  port: 50000,
  database: 'testdb',
  user: 'db2inst1',
  password: 'password',
  schema: 'DB2INST1'  // Default schema to use for testing
};

// Configure deep inspection for objects
const inspect = (obj) => util.inspect(obj, { colors: true, depth: 5 });

// Helper function to log each step with visual separation
function logStep(step, details = null) {
  console.log('\n' + '='.repeat(80));
  console.log(`STEP ${step}`);
  console.log('='.repeat(80));
  if (details) console.log(details);
}

// Main function to simulate API flow
async function simulateApiFlow() {
  let connection = null;
  
  try {
    logStep(1, 'Connecting to DB2 database');
    
    // Build connection string
    const connectionString = 
      "DRIVER={DB2};DATABASE=" + CONNECTION.database + 
      ";HOSTNAME=" + CONNECTION.server + 
      ";UID=" + CONNECTION.user + 
      ";PWD=" + CONNECTION.password + 
      ";PORT=" + CONNECTION.port + 
      ";PROTOCOL=TCPIP";
    
    console.log('Connection string:', connectionString);
    
    // Establish connection
    connection = await new Promise((resolve, reject) => {
      try {
        console.log('Attempting to connect to DB2...');
        const conn = ibmdb.openSync(connectionString);
        console.log('Connection established successfully');
        resolve(conn);
      } catch (error) {
        console.error('Failed to connect to DB2:', error);
        reject(error);
      }
    });
    
    // STEP 2: Get server version
    logStep(2, 'Getting server version (first API call when connecting)');
    const version = await driver.getVersion(connection);
    console.log('DB2 Server Version:', inspect(version));
    
    // STEP 3: List schemas
    logStep(3, 'Listing schemas (when expanding the connection)');
    const schemas = await driver.listSchemas(connection);
    console.log(`Found ${schemas.length} schemas:`, schemas);
    
    // Use specified schema or first available
    const testSchema = CONNECTION.schema || (schemas.length > 0 ? schemas[0] : null);
    
    if (!testSchema) {
      throw new Error('No schema available for testing');
    }
    
    console.log('Using schema for structure test:', testSchema);
    
    // STEP 4: Get database structure for the schema
    logStep(4, `Getting database structure for schema "${testSchema}" (when expanding a schema)`);
    console.log('This is the critical call that might be failing in the UI');
    
    const structure = await driver.getStructure(connection, testSchema);
    
    // Log the structure results
    console.log('\nStructure retrieval results:');
    console.log('- Tables found:', structure.tables?.length || 0);
    console.log('- Views found:', structure.views?.length || 0);
    console.log('- Procedures found:', structure.procedures?.length || 0);
    console.log('- Functions found:', structure.functions?.length || 0);
    
    // Display details of found objects
    if (structure.tables && structure.tables.length > 0) {
      console.log('\nExample table:', inspect(structure.tables[0]));
    } else {
      console.log('\nNo tables found in the structure!');
    }
    
    if (structure.views && structure.views.length > 0) {
      console.log('\nExample view:', inspect(structure.views[0]));
    }
    
    // STEP 5: Check if the data is properly structured for the UI
    logStep(5, 'Verifying structure format for UI display');
    
    // Check for required properties that the UI might depend on
    const structureHasRequiredFormat = 
      structure && 
      Array.isArray(structure.tables) &&
      structure.tables.every(table => table.schemaName && table.tableName);
    
    if (structureHasRequiredFormat) {
      console.log('✅ Structure data format appears correct for UI display');
    } else {
      console.log('❌ Structure data format may be incorrect for UI display');
      console.log('The UI might not be able to process this structure format');
    }
    
    // Final analysis
    logStep('CONCLUSION', 'API Flow Analysis');
    
    if (structure && 
        ((structure.tables && structure.tables.length > 0) || 
         (structure.views && structure.views.length > 0))) {
      console.log('✅ API flow successful - database objects were retrieved');
      console.log('Since the direct API calls work, the problem is likely in the frontend');
      console.log('or in how the API results are processed by the UI.');
    } else {
      console.log('❌ API flow failed - no database objects were retrieved');
      console.log('The problem is in the backend implementation of getStructure()');
    }
    
  } catch (error) {
    console.error('\n❌ ERROR during API flow simulation:', error);
  } finally {
    // Close the connection
    if (connection) {
      try {
        connection.closeSync();
        console.log('\nDB2 connection closed');
      } catch (err) {
        console.error('\nError closing DB2 connection:', err);
      }
    }
  }
}

// Run the simulation
console.log('DB2 API Flow Verification');
console.log('This script simulates the API flow when browsing DB2 database objects');
console.log('\nConnection settings:');
console.log('- Server:', CONNECTION.server);
console.log('- Port:', CONNECTION.port);
console.log('- Database:', CONNECTION.database);
console.log('- User:', CONNECTION.user);
console.log('- Test Schema:', CONNECTION.schema);

console.log('\nNOTE: Update the CONNECTION object with your DB2 connection details before running');

// Check if connection details have been updated
if (CONNECTION.server === 'localhost' && 
    CONNECTION.user === 'db2inst1' && 
    CONNECTION.password === 'password') {
  console.log('\n⚠️  WARNING: You are using default connection settings');
  console.log('You should update the CONNECTION object in this script with your actual DB2 details');
}

// Run the simulation
simulateApiFlow().then(() => {
  console.log('\nDB2 API flow verification complete');
}).catch(err => {
  console.error('\nDB2 API flow verification failed:', err);
});
