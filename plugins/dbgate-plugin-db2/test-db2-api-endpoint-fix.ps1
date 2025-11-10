# Test script for verifying DB2 schema-list and structure API endpoints
# Author: AI Assistant
# Date: 2024-05-21

Write-Host "===== DB2 API Endpoint Test =====" -ForegroundColor Cyan

# Navigate to the plugin directory
cd "d:\Yamany Task\dbGate-new\dbgate\plugins\dbgate-plugin-db2"

# Create a simple test script
$testScriptContent = @"
// Test script for DB2 API endpoints
const driver = require('./src/backend/driver');
const connectHelper = require('./src/backend/connect-fixed');

async function testApiEndpoints() {
  console.log('===== DB2 API Endpoint Test =====');
  
  // Log driver details to verify correct configuration
  console.log('Driver ID:', driver.id);
  console.log('Driver Name:', driver.name);
  console.log('Driver Engine:', driver.engine);
  
  // Check if critical methods exist
  const requiredMethods = ['listSchemas', 'getStructure', 'getVersion'];
  for (const method of requiredMethods) {
    console.log(\`Method \${method} exists: \${typeof driver[method] === 'function'}\`);
  }

  // Replace these with your actual DB2 connection details
  const connection = {
    server: 'localhost',  // Replace with your server
    port: 50000,          // Replace with your port
    user: 'db2inst1',     // Replace with your username
    password: 'password', // Replace with your password
    database: 'SAMPLE',   // Replace with your database
  };

  // Comment out the code below and add your connection details to test with a real connection
  /*
  try {
    console.log('\\nConnecting to DB2...');
    const dbhan = await connectHelper.connect(connection);
    console.log('Connected successfully to DB2');

    // Test listSchemas method
    console.log('\\nTesting listSchemas method:');
    const schemas = await driver.listSchemas(dbhan);
    console.log(\`Found \${schemas.length} schemas\`);
    console.log('Schemas:', schemas);

    // Test getStructure method using first schema
    if (schemas.length > 0) {
      const schema = schemas[0].name;
      console.log(\`\\nTesting getStructure method for schema: \${schema}\`);
      const structure = await driver.getStructure(dbhan, schema);
      console.log('Structure information:');
      console.log(\`- Tables: \${structure.tables.length}\`);
      console.log(\`- Views: \${structure.views.length}\`);
      console.log(\`- Functions: \${structure.functions.length}\`);
      console.log(\`- Procedures: \${structure.procedures.length}\`);
    }

    // Close connection
    await driver.close(dbhan);
  } catch (err) {
    console.error('Error testing API endpoints:', err);
  }
  */
}

testApiEndpoints().catch(err => {
  console.error('Unhandled error:', err);
});
"@

# Save the test script
$testScriptContent | Out-File -FilePath "test-db2-api-endpoint-fix.js" -Encoding utf8

# Run the test script
Write-Host "`nRunning test script to verify API endpoints..." -ForegroundColor Yellow
node test-db2-api-endpoint-fix.js

Write-Host "`nTest completed." -ForegroundColor Green
Write-Host "If the test shows all required methods exist, the fix should be working." -ForegroundColor Green
Write-Host "Uncomment the connection test code and add your DB2 credentials to perform a full test." -ForegroundColor Yellow
