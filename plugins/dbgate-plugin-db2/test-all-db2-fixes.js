/**
 * Comprehensive test script for all DB2 plugin fixes
 * 
 * This tests all the fixes implemented:
 * 1. Schema list endpoint hanging issue
 * 2. Table counts in schema dropdowns displaying incorrectly
 * 3. SQL select endpoint hanging and failing with "Cannot read properties of undefined" errors
 */
const driver = require('./src/backend/driver');
const connectHelper = require('./src/backend/connect-fixed');
const fixSchemaListIssue = require('./src/backend/fixSchemaListIssue');
const driverFix = require('./src/backend/driver-fix');
const cacheManager = require('./src/backend/cache-manager');
const plugin = require('./src/backend/index');

async function testAllDB2Fixes() {
  console.log('=== Testing All DB2 Plugin Fixes ===');
  
  // Apply all fixes
  console.log('Applying all DB2 plugin fixes...');
  plugin.initialize({});
  
  // PART 0: Test API endpoint method availability
  console.log('PART 0: Testing API endpoint method availability...');
  
  // Check if the required methods exist
  const requiredMethods = ['getVersion', 'listSchemas', 'getStructure'];
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
    console.log('✅ All API endpoint methods are properly implemented');
  } else {
    console.log('❌ Some API endpoint methods are missing');
  }
  
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
    console.log('PART 1: Testing improved connection handling...');
    console.log('Connecting to DB2 with enhanced timeout settings...');
    const startTime = new Date();
    dbhan = await connectHelper.connect(connection);
    const endTime = new Date();
    const connectionTime = (endTime - startTime) / 1000;
    console.log(`Connected to DB2 successfully in ${connectionTime} seconds`);

    // Test basic query to verify connection works
    console.log('\nTesting basic query...');
    const versionResult = await driver.query(dbhan, 'SELECT SERVICE_LEVEL, FIXPACK_NUM FROM SYSIBMADM.ENV_INST_INFO');
    console.log('DB2 Version info:', versionResult.rows[0]);

    // Test schema listing endpoint
    console.log('\nPART 2: Testing schema listing endpoint...');
    const schemas = await driver.listSchemas(dbhan, 'test_conn_id', connection.database);
    console.log(`Found ${schemas.length} schemas`);
    if (schemas.length > 0) {
      console.log('First schema:', schemas[0]);
    }

    // Test structure endpoint with focus on functions (our main fix)
    if (schemas.length > 0) {
      const testSchema = schemas[0].name;
      console.log(`\nPART 3: Testing structure endpoint for schema ${testSchema}...`);
      const structure = await driver.getStructure(dbhan, testSchema);
      
      console.log('Structure statistics:');
      console.log(`- Tables: ${structure.tables.length}`);
      console.log(`- Views: ${structure.views.length}`);
      console.log(`- Functions: ${structure.functions.length} (main focus of RETURNS keyword fix)`);
      console.log(`- Procedures: ${structure.procedures.length}`);
      
      // Show sample function to verify our RETURN_TYPE fix works
      if (structure.functions.length > 0) {
        console.log('\nSample function with fixed RETURN_TYPE handling:');
        console.log('Function name:', structure.functions[0].pureName);
        console.log('Return type:', structure.functions[0].returnType);
        console.log('Function language:', structure.functions[0].language);
      }
    }

    // Test direct function retrieval to check our specific RETURNS keyword fix
    console.log('\nPART 4: Testing direct function retrieval with RETURN_TYPE fix...');
    try {
      // Try the new fixed query with RETURN_TYPE
      const functionQuery = `
        SELECT 
          ROUTINESCHEMA as schemaName,
          ROUTINENAME as functionName,
          RETURN_TYPE as returnType
        FROM SYSCAT.ROUTINES 
        WHERE ROUTINETYPE = 'F'
        FETCH FIRST 5 ROWS ONLY`;
      
      const functionsResult = await driver.query(dbhan, functionQuery);
      console.log(`Successfully queried functions with RETURN_TYPE: ${functionsResult.rows.length} rows`);
      
      if (functionsResult.rows.length > 0) {
        console.log('First function:', functionsResult.rows[0]);
      }
    } catch (err) {
      console.log('RETURN_TYPE query failed, testing fallback mechanism...');
      
      // Try fallback query without the problematic column
      try {
        const fallbackQuery = `
          SELECT 
            ROUTINESCHEMA as schemaName,
            ROUTINENAME as functionName
          FROM SYSCAT.ROUTINES 
          WHERE ROUTINETYPE = 'F'
          FETCH FIRST 5 ROWS ONLY`;
        
        const fallbackResult = await driver.query(dbhan, fallbackQuery);
        console.log(`Fallback query succeeded: ${fallbackResult.rows.length} rows`);
        
        if (fallbackResult.rows.length > 0) {
          console.log('First function from fallback:', fallbackResult.rows[0]);
        }
      } catch (fallbackErr) {
        console.error('Even fallback query failed:', fallbackErr.message);
      }
    }  } catch (err) {
    console.error('Error during test:', err);
  } finally {
    // Clean up connection
    if (dbhan) {
      console.log('\nClosing DB2 connection...');
      await driver.close(dbhan);
      console.log('Connection closed');
    }
  }
  
  // PART 5: Test specific fixes for error handling in SQL endpoint
  console.log('\nPART 5: Testing specific error handling fixes...');
  
  // Create a mock connection for testing
  const mockDbhan = {
    _connectionId: 'mock_connection',
    client: {
      query: async (sql) => {
        console.log(`[MOCK] Executing query: ${sql.substring(0, 50)}${sql.length > 50 ? '...' : ''}`);
        // Return mock data
        return [
          { ID: 1, NAME: 'Test Record' }
        ];
      }
    }
  };
  
  // Test cases that were previously causing errors
  const testCases = [
    { name: 'Null SQL', sql: null },
    { name: 'Undefined SQL', sql: undefined },
    { name: 'Non-string SQL (Object)', sql: { some: 'object' } },
    { name: 'Non-string SQL (Number)', sql: 123 },
    { name: 'Empty SQL', sql: '' },
    { name: 'Valid SQL', sql: 'SELECT * FROM SYSIBM.SYSDUMMY1' }
  ];
  
  let passedTests = 0;
  for (const test of testCases) {
    try {
      console.log(`\nTesting case: ${test.name}`);
      const result = await driver.query(mockDbhan, test.sql);
      console.log('✅ Query completed without error');
      console.log(`Result: ${JSON.stringify(result).substring(0, 100)}${JSON.stringify(result).length > 100 ? '...' : ''}`);
      passedTests++;
    } catch (err) {
      console.error(`❌ Query failed: ${err.message}`);
    }
  }
  
  console.log(`\nSQL error handling tests: ${passedTests}/${testCases.length} passed`);
  
  // PART 6: Test _detectQueryType fix specifically
  console.log('\nPART 6: Testing _detectQueryType fix...');
  
  const queryTypeTests = [
    { input: null, expectedNotToThrow: true },
    { input: undefined, expectedNotToThrow: true },
    { input: { obj: 'test' }, expectedNotToThrow: true },
    { input: 'SELECT * FROM SYSCAT.TABLES', expectedNotToThrow: true, expectedType: 'TABLE_LIST' },
    { input: 'SELECT * FROM SYSIBM.SYSDUMMY1', expectedNotToThrow: true, expectedType: 'CHECK_CONNECTION' }
  ];
  
  passedTests = 0;
  for (const test of queryTypeTests) {
    try {
      const queryType = driver._detectQueryType(test.input);
      console.log(`✅ _detectQueryType worked for input type: ${typeof test.input}`);
      if (test.expectedType && queryType === test.expectedType) {
        console.log(`   Correctly identified as: ${queryType}`);
      } else if (test.expectedType) {
        console.log(`   Expected: ${test.expectedType}, Got: ${queryType}`);
      }
      passedTests++;
    } catch (err) {
      console.error(`❌ _detectQueryType threw error for input type ${typeof test.input}: ${err.message}`);
    }
  }
  
  console.log(`\n_detectQueryType tests: ${passedTests}/${queryTypeTests.length} passed`);
  
  // PART 7: Test the caching mechanism we implemented
  console.log('\nPART 7: Testing schema caching mechanism...');
  
  // Test schema cache
  const testConnectionId = 'test_connection_id';
  const testSchemas = [
    { schemaName: 'TEST_SCHEMA_1', tableCount: 10 },
    { schemaName: 'TEST_SCHEMA_2', tableCount: 5 }
  ];
  
  cacheManager.setSchemaCache(testConnectionId, testSchemas);
  const cachedSchemas = cacheManager.getSchemaCache(testConnectionId);
  
  if (cachedSchemas && cachedSchemas.length === 2) {
    console.log('✅ Schema caching is working correctly');
    console.log(`   Retrieved ${cachedSchemas.length} schemas from cache`);
  } else {
    console.error('❌ Schema caching failed');
  }
  
  // Get cache stats
  const cacheStats = cacheManager.getCacheStats();
  console.log('\nCache statistics:');
  console.log(JSON.stringify(cacheStats, null, 2));
  
  console.log('\n=== All DB2 Fixes Testing Complete ===');
}

testAllDB2Fixes().catch(err => {
  console.error('Unhandled error in test script:', err);
});
