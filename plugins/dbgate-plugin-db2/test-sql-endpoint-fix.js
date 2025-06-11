/**
 * Test script for DB2 SQL endpoint and query handling
 *
 * This script verifies that the fixes for the hanging SQL endpoint
 * and the "Cannot read properties of undefined" errors have been fixed.
 */

const driver = require('./src/backend/driver');
const driverFix = require('./src/backend/driver-fix');

async function testSqlEndpointFix() {
  console.log('====== Testing DB2 SQL endpoint fixes ======');
  
  // Apply the driver fixes
  driverFix.fixDriverIssues(driver);
  
  // Create a mock connection
  const mockDbhan = {
    _connectionId: 'test_connection',
    client: {
      query: async (sql) => {
        console.log(`[MOCK] Executing query: ${sql}`);
        // Simulate a successful query
        return [
          { ID: 1, NAME: 'Sample Row 1' },
          { ID: 2, NAME: 'Sample Row 2' }
        ];
      }
    }
  };
  
  // Test cases that would previously cause errors
  const testCases = [
    {
      name: 'Null SQL',
      sql: null,
      params: []
    },
    {
      name: 'Undefined SQL',
      sql: undefined,
      params: []
    },
    {
      name: 'Non-string SQL',
      sql: { some: 'object' },
      params: []
    },
    {
      name: 'Empty SQL',
      sql: '',
      params: []
    },
    {
      name: 'Valid SQL',
      sql: 'SELECT * FROM SAMPLE_TABLE',
      params: []
    },
    {
      name: 'SQL with params',
      sql: 'SELECT * FROM SAMPLE_TABLE WHERE ID = ?',
      params: [1]
    }
  ];
  
  // Run tests
  let passed = 0;
  for (const test of testCases) {
    try {
      console.log(`\nRunning test: ${test.name}`);
      const result = await driver.query(mockDbhan, test.sql, test.params);
      console.log(`✅ Test "${test.name}" passed`);
      console.log(`Result: ${JSON.stringify(result, null, 2)}`);
      passed++;
    } catch (err) {
      console.error(`❌ Test "${test.name}" failed: ${err.message}`);
    }
  }
  
  console.log(`\n${passed} of ${testCases.length} tests passed`);
  
  // Test that the _detectQueryType method works without errors
  const queryTypes = [
    'SELECT * FROM SYSIBM.SYSDUMMY1',
    'SELECT * FROM SYSCAT.SCHEMATA',
    'SELECT * FROM SYSCAT.TABLES',
    'SELECT * FROM SYSCAT.COLUMNS',
    'SELECT * FROM SYSCAT.ROUTINES',
    'SELECT * FROM SYSCAT.VIEWS',
    'SELECT CURRENT SCHEMA FROM SYSIBM.SYSDUMMY1',
    'SELECT CURRENT SERVER FROM SYSIBM.SYSDUMMY1',
    null,
    undefined,
    { invalid: 'input' }
  ];
  
  console.log('\nTesting _detectQueryType method:');
  for (const query of queryTypes) {
    try {
      const queryType = driver._detectQueryType(query);
      console.log(`✅ Query "${String(query).substring(0, 30)}..." detected as: ${queryType}`);
    } catch (err) {
      console.error(`❌ Query type detection failed for "${query}": ${err.message}`);
    }
  }
  
  console.log('\n====== SQL endpoint tests completed ======');
}

testSqlEndpointFix().catch(err => {
  console.error('Test failed with error:', err);
});
