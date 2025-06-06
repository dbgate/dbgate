// Test script to verify DB2 driver methods needed for API endpoints
const driver = require('./src/backend/driver');
const connectHelper = require('./src/backend/connect-fixed');

async function testEndpoints() {
  console.log('=== Testing DB2 API Endpoint Methods ===');

  // Initialize the driver
  driver.initialize();
  
  // Verify the required methods exist
  console.log('\nChecking required methods:');
  
  // List of required methods for API endpoints
  const requiredMethods = [
    'getVersion',
    'listSchemas',
    'getStructure'
  ];
  
  let allMethodsExist = true;
  for (const method of requiredMethods) {
    if (typeof driver[method] === 'function') {
      console.log(`✅ ${method} - Method exists`);
    } else {
      console.log(`❌ ${method} - Method MISSING`);
      allMethodsExist = false;
    }
  }
  
  if (allMethodsExist) {
    console.log('\n✅ All required methods for API endpoints exist');
    console.log('The DB2 plugin should properly handle API endpoint requests');
  } else {
    console.log('\n❌ Some required methods are missing');
  }
  
  // Test with an actual connection (commented out by default)
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
  
  try {
    console.log('\n\n=== Testing Actual API Endpoint Methods ===');
    console.log('To test with an actual DB2 connection, uncomment the code below and set your connection details');
    
    // Uncomment the following lines and add your real connection details to test with an actual DB2 instance
    /*
    console.log('Connecting to DB2...');
    const dbhan = await connectHelper.connect(connection);
    console.log('Connected to DB2 successfully');
    
    // Test getVersion method
    console.log('\nTesting getVersion method...');
    const versionInfo = await driver.getVersion(dbhan);
    console.log('Server version:', versionInfo);
    
    // Test listSchemas method
    console.log('\nTesting listSchemas method...');
    const schemas = await driver.listSchemas(dbhan);
    console.log(`Found ${schemas.length} schemas`);
    
    // Test getStructure method
    if (schemas && schemas.length > 0) {
      const schemaName = schemas[0].name;
      console.log(`\nTesting getStructure method for schema: ${schemaName}...`);
      const structure = await driver.getStructure(dbhan, schemaName);
      console.log('Structure statistics:');
      console.log(`- Tables: ${structure.tables.length}`);
      console.log(`- Views: ${structure.views.length}`);
      console.log(`- Functions: ${structure.functions.length}`);
      console.log(`- Procedures: ${structure.procedures.length}`);
    } else {
      console.log('\nNo schemas found, skipping getStructure test');
    }
    
    await driver.close(dbhan);
    */
  } catch (err) {
    console.error('Error testing API endpoint methods:', err);
  }
  
  console.log('\n=== API Endpoint Method Testing Complete ===');
}

testEndpoints();
