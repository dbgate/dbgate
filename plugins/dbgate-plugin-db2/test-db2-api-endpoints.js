// Test script for DB2 API endpoints
const driver = require('./src/backend/driver');
const connectHelper = require('./src/backend/connect-fixed');

async function testApiEndpoints() {
  console.log('=== Testing DB2 API Endpoints ===');
  
  // Replace these with your actual DB2 connection details
  const connection = {
    server: 'your_server',
    port: 50000,
    user: 'db2inst1',
    password: 'your_password',
    database: 'sample',
    databaseName: 'sample', // Sometimes needed as an alias
    engine: 'db2@dbgate-plugin-db2',
    useSsl: false
  };

  let dbhan = null;
  try {
    console.log('Connecting to DB2...');
    dbhan = await connectHelper.connect(connection);
    console.log('Connected to DB2 successfully');

    // Test schema listing endpoint
    console.log('\n=== Testing /database-connections/schema-list endpoint ===');
    const schemas = await driver.listSchemas(dbhan, 'test_conn_id', connection.database);
    console.log('Retrieved schemas:', schemas);
    console.log(`Found ${schemas.length} schemas`);

    // If schemas were found, test structure endpoint on the first schema
    if (schemas.length > 0) {
      const testSchema = schemas[0].name;
      console.log(`\n=== Testing /database-connections/structure endpoint for schema ${testSchema} ===`);
      const structure = await driver.getStructure(dbhan, testSchema);
      
      console.log('Structure statistics:');
      console.log(`- Tables: ${structure.tables.length}`);
      console.log(`- Views: ${structure.views.length}`);
      console.log(`- Functions: ${structure.functions.length}`);
      console.log(`- Procedures: ${structure.procedures.length}`);
      
      // Show sample of each object type
      if (structure.tables.length > 0) {
        console.log('\nSample table:', structure.tables[0]);
      }
      
      if (structure.views.length > 0) {
        console.log('\nSample view:', structure.views[0]);
      }
      
      if (structure.functions.length > 0) {
        console.log('\nSample function:', structure.functions[0]);
      }
      
      if (structure.procedures.length > 0) {
        console.log('\nSample procedure:', structure.procedures[0]);
      }
    }
  } catch (err) {
    console.error('Error testing API endpoints:', err);
  } finally {
    // Clean up connection
    if (dbhan) {
      console.log('\nClosing DB2 connection...');
      await driver.close(dbhan);
      console.log('Connection closed');
    }
  }
  
  console.log('\n=== API Endpoint Testing Complete ===');
}

testApiEndpoints().catch(err => {
  console.error('Unhandled error in test script:', err);
});
