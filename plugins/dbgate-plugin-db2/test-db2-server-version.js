// Test script for DB2 server-version API endpoint
const driver = require('./src/backend/driver');
const connectHelper = require('./src/backend/connect-fixed');

async function testServerVersionEndpoint() {
  console.log('=== Testing DB2 server-version API Endpoint ===');
  
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

    // Test the getVersion method which is called by the server-version endpoint
    console.log('\nTesting getVersion method (used by server-version API endpoint)...');
    const versionInfo = await driver.getVersion(dbhan);
    
    console.log('DB2 Version Information:');
    console.log('- Version:', versionInfo.version);
    console.log('- Version Text:', versionInfo.versionText);
    
    if (versionInfo.version && versionInfo.versionText) {
      console.log('\n✅ server-version API endpoint should work correctly');
      console.log('The endpoint will return the version information shown above');
    } else {
      console.log('\n⚠️ Warning: Incomplete version information returned');
      console.log('The server-version API endpoint may not work correctly');
    }
    
    // Try a direct version query to verify our approach
    console.log('\nTrying direct version query...');
    try {
      const directVersionQuery = `SELECT SERVICE_LEVEL as version, FIXPACK_NUM as fixpack FROM SYSIBMADM.ENV_INST_INFO`;
      const result = await driver.query(dbhan, directVersionQuery);
      if (result && result.rows && result.rows.length > 0) {
        console.log('Direct query result:', result.rows[0]);
      } else {
        console.log('No results from direct version query');
      }
    } catch (err) {
      console.log(`Direct version query failed: ${err.message}`);
      
      // Try fallback approach
      try {
        const fallbackQuery = `SELECT GETVARIABLE('SYSIBM.VERSION') as version FROM SYSIBM.SYSDUMMY1`;
        const result = await driver.query(dbhan, fallbackQuery);
        if (result && result.rows && result.rows.length > 0) {
          console.log('Fallback query result:', result.rows[0]);
        } else {
          console.log('No results from fallback version query');
        }
      } catch (fallbackErr) {
        console.log(`Fallback version query failed: ${fallbackErr.message}`);
      }
    }

  } catch (err) {
    console.error('Error testing server-version endpoint:', err);
  } finally {
    // Clean up connection
    if (dbhan) {
      console.log('\nClosing DB2 connection...');
      await driver.close(dbhan);
      console.log('Connection closed');
    }
  }
  
  console.log('\n=== Server-Version API Endpoint Testing Complete ===');
}

testServerVersionEndpoint().catch(err => {
  console.error('Unhandled error in test script:', err);
});
