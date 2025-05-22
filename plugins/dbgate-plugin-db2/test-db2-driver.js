// Test script for DB2 driver
const driver = require('./src/backend/driver');
const ibmdb = require('ibm_db');

async function testDB2Connection() {
  console.log('Starting DB2 connection test');
  
  // Replace with your connection details
  const connectionConfig = {
    server: 'localhost',  // replace with your server
    port: 25000,          // replace with your port
    user: 'db2inst1',     // replace with your username
    password: 'password', // replace with your password
    database: 'SAMPLE',   // replace with your database
    ssl: false,
    isReadOnly: false,
    useDatabaseUrl: false,
    databaseUrl: '',
    ibmdb
  };
  
  try {
    // Test connection
    console.log('Connecting to DB2...');
    const conn = await driver.connect(connectionConfig);
    console.log('Connection successful!');
    
    // Test schema retrieval
    console.log('\nTesting schema retrieval...');
    const schemas = await driver.listSchemas(conn);
    console.log(`Retrieved ${schemas.length} schemas`);
    if (schemas.length > 0) {
      console.log('Sample schemas:', schemas.slice(0, 3));
    }
    
    // Test function retrieval with RETURN_TYPE handling
    console.log('\nTesting function retrieval...');
    const testSchema = schemas[0]?.name || 'DB2INST1';
    console.log(`Using schema: ${testSchema}`);
    
    try {
      const structure = await driver.getStructure(conn, testSchema);
      console.log(`Retrieved ${structure.functions.length} functions from getStructure()`);
      if (structure.functions.length > 0) {
        console.log('Sample function:', structure.functions[0]);
      }
    } catch (structErr) {
      console.error('Error in getStructure:', structErr.message);
    }
    
    // Direct test of the functions query with RETURN_TYPE
    console.log('\nTesting direct function query with RETURN_TYPE...');
    try {
      const functionQuery = `
        SELECT 
          ROUTINESCHEMA as schemaName,
          ROUTINENAME as functionName,
          REMARKS as description,
          TEXT as definition,
          PARAMETER_STYLE as parameterStyle,
          LANGUAGE as language,
          RETURN_TYPE as returnType,
          CREATE_TIME as createTime,
          ALTER_TIME as alterTime
        FROM SYSCAT.ROUTINES 
        WHERE ROUTINETYPE = 'F'
        AND ROUTINESCHEMA = ?
        ORDER BY ROUTINENAME
        FETCH FIRST 5 ROWS ONLY
      `;
      
      const functionsResult = await driver.query(conn, functionQuery, [testSchema]);
      console.log(`Direct query returned ${functionsResult.rows.length} functions`);
      if (functionsResult.rows.length > 0) {
        console.log('First function from direct query:', functionsResult.rows[0]);
        console.log('Return type field value:', functionsResult.rows[0].RETURN_TYPE || functionsResult.rows[0].returnType || 'Not present');
      }
    } catch (funcQueryErr) {
      console.error('Error in direct function query with RETURN_TYPE:', funcQueryErr.message);
      
      // Try fallback query without RETURN_TYPE
      console.log('\nTrying fallback query without RETURN_TYPE...');
      try {
        const fallbackQuery = `
          SELECT 
            ROUTINESCHEMA as schemaName,
            ROUTINENAME as functionName,
            REMARKS as description,
            TEXT as definition,
            PARAMETER_STYLE as parameterStyle,
            LANGUAGE as language,
            CREATE_TIME as createTime,
            ALTER_TIME as alterTime
          FROM SYSCAT.ROUTINES 
          WHERE ROUTINETYPE = 'F'
          AND ROUTINESCHEMA = ?
          ORDER BY ROUTINENAME
          FETCH FIRST 5 ROWS ONLY
        `;
        
        const fallbackResult = await driver.query(conn, fallbackQuery, [testSchema]);
        console.log(`Fallback query returned ${fallbackResult.rows.length} functions`);
        if (fallbackResult.rows.length > 0) {
          console.log('First function from fallback query:', fallbackResult.rows[0]);
        }
      } catch (fallbackErr) {
        console.error('Error in fallback function query:', fallbackErr.message);
      }
    }
    
    // Close connection
    console.log('\nClosing connection...');
    await driver.close(conn);
    console.log('Connection closed');
    
  } catch (err) {
    console.error('Test failed:', err.message);
  }
}

// Run the test
testDB2Connection().catch(err => {
  console.error('Unhandled error:', err);
});
