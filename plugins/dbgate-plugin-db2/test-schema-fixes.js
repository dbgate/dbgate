/**
 * Test script for DB2 schema list endpoint fixes
 * 
 * This script can be used to verify that the fixes for the schema list endpoint
 * have been applied correctly.
 */
const plugin = require('./src/backend/index');
const driver = plugin.drivers[0];
const fixSchemaListIssue = require('./src/backend/fixSchemaListIssue');

async function testSchemaListEndpointFix() {
  console.log('====== Testing DB2 schema list endpoint fix ======');
  console.log('Plugin:', plugin.packageName);
  console.log('Driver ID:', driver.id);
  
  // Initialize the driver
  plugin.initialize({});
  
  // Create a mock connection
  const mockConnection = {
    _connectionId: 'test_connection',
    _connectionParams: { useCaching: true },
    _refreshingCounts: false
  };
  
  // Create mock schemas
  const mockSchemas = [
    { schemaName: 'DB2ADMIN', objectType: 'schema' },
    { schemaName: 'SYSIBM', objectType: 'schema' },
    { schemaName: 'SYSCAT', objectType: 'schema' }
  ];
  
  // Test refreshing counts
  console.log('\nChecking if _refreshSchemaCounts method exists:');
  if (typeof driver._refreshSchemaCounts === 'function') {
    console.log('✅ _refreshSchemaCounts method exists');
  } else {
    console.error('❌ _refreshSchemaCounts method does not exist');
    return;
  }
  
  // Mock the driver.query method for testing
  const originalQuery = driver.query;
  driver.query = async (dbhan, sql, params) => {
    console.log(`Mock query executed: ${sql}`);
    console.log(`With params: ${params}`);
    
    // Return mock results
    return {
      rows: [{ COUNT: 5, count: 5 }],
      columns: [{ columnName: 'count' }],
      rowCount: 1
    };
  };
  
  // Test the method with a timeout to check for hanging
  console.log('\nTesting schema count refresh with a 5 second timeout:');
  let timeoutId = setTimeout(() => {
    console.error('❌ Test timed out - schema count refresh is hanging!');
    process.exit(1);
  }, 5000);
  
  try {
    await driver._refreshSchemaCounts(mockConnection, 'test_connection', mockSchemas);
    clearTimeout(timeoutId);
    console.log('✅ Schema count refresh completed without hanging');
    
    // Check if the schemas were updated with counts
    console.log('\nChecking schema counts:');
    for (const schema of mockSchemas) {
      console.log(`Schema ${schema.schemaName}: tableCount=${schema.tableCount}`);
      if (typeof schema.tableCount === 'number') {
        console.log(`✅ Schema ${schema.schemaName} has valid count`);
      } else {
        console.error(`❌ Schema ${schema.schemaName} has invalid count`);
      }
    }
  } catch (err) {
    clearTimeout(timeoutId);
    console.error('❌ Schema count refresh failed with error:', err);
    return;
  }
  
  // Restore original query method
  driver.query = originalQuery;
  
  console.log('\n====== Test completed successfully ======');
}

testSchemaListEndpointFix().catch(err => {
  console.error('Test failed with error:', err);
  process.exit(1);
});
