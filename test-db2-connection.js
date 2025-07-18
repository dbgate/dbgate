// Test connection script for DB2
const { connect } = require('./plugins/dbgate-plugin-db2/src/backend/connect-fixed');

async function testConnection() {
  console.log('Testing DB2 connection with port override...');
  
  try {
    // Create an IBM DB2 mock for testing
    const mockIbmDb = {
      open: (connStr) => {
        console.log(`[MOCK] Would connect with: ${connStr}`);
        return Promise.resolve({
          query: (sql) => Promise.resolve([{1: 1}]),
          close: () => Promise.resolve()
        });
      }
    };
    
    // Try to connect using the modified logic
    const result = await connect({
      server: '45.241.60.18',
      port: 50000,  // This should be overridden to 25000 by our code
      user: 'db2inst1',
      password: 'db2inst1',
      database: 'SAMPLE',
      ibmdb: mockIbmDb,
      connectTimeout: 180,
      connectionRetries: 10,
      queryTimeout: 120
    });
    
    console.log('Connection successful:', result);
  } catch (err) {
    console.error('Connection failed:', err.message);
  }
}

testConnection().catch(console.error);
