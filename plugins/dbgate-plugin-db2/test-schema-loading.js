// Test script for DB2 schema loading

// Initialize the required global packages first
global.DBGATE_PACKAGES = {
  'dbgate-tools': require('dbgate-tools'),
  'dbgate-sqltree': require('dbgate-sqltree'),
};

const driver = require('./src/backend/driver');
const connectHelper = require('./src/backend/connect-fixed');

async function testSchemaLoading() {
  console.log('=== Testing DB2 Schema Loading ===');
  
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

    // Test schema listing
    console.log('\n=== Testing Schema Listing ===');
    const schemas = await driver.listSchemas(dbhan, 'test_conn_id', connection.database);
    console.log('Retrieved schemas:', schemas);
    console.log(`Found ${schemas.length} schemas`);

    // If schemas were found, test structure retrieval for each schema
    if (schemas.length > 0) {
      for (const schema of schemas) {
        console.log(`\n=== Testing Structure Retrieval for Schema: ${schema.name} ===`);
        const structure = await driver.getStructure(dbhan, schema.name);
        
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
    }
  } catch (err) {
    console.error('Error testing schema loading:', err);
  } finally {
    // Clean up connection
    if (dbhan) {
      console.log('\nClosing DB2 connection...');
      await driver.close(dbhan);
      console.log('Connection closed');
    }
  }
  
  console.log('\n=== Schema Loading Test Complete ===');
}

// Run the test
testSchemaLoading().catch(console.error); 