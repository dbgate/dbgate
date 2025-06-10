// Test script to verify DB2 global package initialization

// Check if global packages are properly initialized
console.log('=== DB2 Global Package Initialization Test ===');

try {
  // Initialize the required global packages
  global.DBGATE_PACKAGES = {
    'dbgate-tools': require('dbgate-tools'),
    'dbgate-sqltree': require('dbgate-sqltree'),
  };
  
  console.log('✓ Global packages initialized successfully');
  console.log('Global.DBGATE_PACKAGES keys:', Object.keys(global.DBGATE_PACKAGES));
  
  // Try to import the ensure-globals helper
  const { ensureGlobalPackages } = require('./src/backend/ensure-globals');
  console.log('✓ ensure-globals module imported successfully');
  
  // Run the helper function
  ensureGlobalPackages();
  console.log('✓ ensureGlobalPackages function executed successfully');
  
  // Try to load the driver
  console.log('Trying to load the driver...');
  const driver = require('./src/backend/driver');
  console.log('✓ Driver loaded successfully');
  
  // Check if driver has the required methods
  const requiredMethods = ['connect', 'listSchemas', 'getStructure', 'getVersion'];
  const missingMethods = requiredMethods.filter(method => typeof driver[method] !== 'function');
  
  if (missingMethods.length > 0) {
    console.error('✗ Driver is missing the following methods:', missingMethods);
  } else {
    console.log('✓ Driver has all required methods');
  }
  
  // Import the connection patches module
  const { applyConnectionPatches } = require('./src/backend/connection-patches');
  console.log('✓ connection-patches module imported successfully');
  
  // Apply connection patches
  applyConnectionPatches(driver);
  console.log('✓ Connection patches applied successfully');
  
  console.log('\nTest completed successfully!');
} catch (err) {
  console.error('✗ Error during test:', err);
  process.exit(1);
}
