# Check for basic node.js functionality
$ErrorActionPreference = "Stop"
Write-Host "=== Testing Node.js environment ==="

try {
    # Check Node version
    $nodeVersion = node --version
    Write-Host "Node.js version: $nodeVersion"
    
    # Create a simple test script
    $testScript = @"
console.log('=== Basic Node.js Test ===');
try {
  console.log('NODE_PATH:', process.env.NODE_PATH);
  console.log('require.resolve paths:', require.resolve.paths('dbgate-tools'));
  
  console.log('\nTrying to require dbgate-tools directly:');
  const tools = require('dbgate-tools');
  console.log('Success! Available exports:', Object.keys(tools));
  
  console.log('\nTrying to require dbgate-sqltree directly:');
  const sqltree = require('dbgate-sqltree');
  console.log('Success! Available exports:', Object.keys(sqltree));
  
  console.log('\nSetting up global.DBGATE_PACKAGES:');
  global.DBGATE_PACKAGES = {
    'dbgate-tools': tools,
    'dbgate-sqltree': sqltree
  };
  console.log('Global packages set up:', Object.keys(global.DBGATE_PACKAGES));
  
  console.log('\nTest completed successfully!');
} catch (err) {
  console.error('Error during test:', err);
  process.exit(1);
}
"@

    # Save the test script to a temporary file
    $testScriptPath = ".\node-basic-test.js"
    $testScript | Out-File -FilePath $testScriptPath -Encoding utf8

    # Run the test script
    Write-Host "`nRunning basic Node.js test..."
    node $testScriptPath
    
    Write-Host "`nTest completed successfully!"
} catch {
    Write-Host "Error: $_" -ForegroundColor Red
    exit 1
}
