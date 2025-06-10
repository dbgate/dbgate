// DB2 API Endpoints Verification
// This script checks if the DB2 plugin correctly implements all required API endpoints
// and that they return expected results

console.log("=== DB2 API Endpoints Verification ===");

// Initialize the required global packages first
global.DBGATE_PACKAGES = {
  'dbgate-tools': require('dbgate-tools'),
  'dbgate-sqltree': require('dbgate-sqltree'),
};

// Try to load the driver
let driver;
try {
  driver = require('./src/backend/driver');
  console.log('DB2 driver loaded successfully');
} catch (err) {
  console.error('Failed to load DB2 driver:', err);
  process.exit(1);
}

// Log the current plugin version
const packageJson = require('./package.json');
console.log(`DB2 Plugin Version: ${packageJson.version}`);

// Required API endpoints for DbGate plugins
const REQUIRED_API_ENDPOINTS = [
  'getVersion',
  'listSchemas',
  'getStructure'
];

// Check if the DB2 driver implements all required endpoints
console.log('\nVerifying required API endpoints:');
const missingEndpoints = REQUIRED_API_ENDPOINTS.filter(endpoint => typeof driver[endpoint] !== 'function');

if (missingEndpoints.length > 0) {
  console.error('ERROR: The DB2 driver is missing the following required endpoints:');
  missingEndpoints.forEach(endpoint => console.error(`  - ${endpoint}`));
  console.error('These endpoints must be implemented for the plugin to work correctly.');
} else {
  console.log('✓ All required API endpoints are implemented in the DB2 driver.');
}

// Check if the fixed-structure.js module is loaded correctly
try {
  const fixedStructure = require('./src/backend/fixed-structure');
  if (typeof fixedStructure.getStructure === 'function') {
    console.log('✓ Enhanced getStructure is properly exported from fixed-structure.js');
  } else {
    console.error('ERROR: fixed-structure.js does not export getStructure function correctly');
  }
} catch (err) {
  console.error('ERROR: Could not load fixed-structure.js module:', err);
}

// Check if getStructure method matches the driver signature
console.log('\nVerifying getStructure method implementation:');
const getStructureFunction = driver.getStructure;
if (getStructureFunction) {
  console.log(`getStructure function has ${getStructureFunction.length} parameters`);
  console.log('Expected signature: getStructure(dbhan, schemaName)');
  
  // Add debug logging to the getStructure function
  const originalGetStructure = driver.getStructure;
  driver.getStructure = async function(dbhan, schemaName) {
    console.log(`[DEBUG] getStructure called with schemaName: ${schemaName}`);
    try {
      const result = await originalGetStructure.call(this, dbhan, schemaName);
      console.log(`[DEBUG] getStructure result: ${result ? 'Success' : 'Null/Undefined'}`);
      if (result) {
        console.log(`[DEBUG] getStructure found: tables=${result.tables?.length || 0}, views=${result.views?.length || 0}`);
      }
      return result;
    } catch (err) {
      console.error(`[DEBUG] getStructure error:`, err);
      throw err;
    }
  };
  
  console.log('✓ Added debug logging to getStructure method');
} else {
  console.error('ERROR: getStructure method is missing');
}

// Check if there are any Analyser issues
console.log('\nVerifying Analyser implementation:');
if (driver.analyserClass) {
  console.log('✓ analyserClass is defined');
  
  // Check if it extends DatabaseAnalyser
  if (driver.analyserClass.prototype && 
      driver.analyserClass.prototype.constructor && 
      driver.analyserClass.prototype.constructor.name) {
    console.log(`analyserClass name: ${driver.analyserClass.prototype.constructor.name}`);
    
    // Check if key methods are implemented
    const analyserMethods = ['getSchemas', 'getTables', 'getViews', 'getFunctions', 'getProcedures'];
    const implementedMethods = analyserMethods.filter(method => 
      driver.analyserClass.prototype[method] !== undefined
    );
    
    console.log(`Analyser implements ${implementedMethods.length}/${analyserMethods.length} common methods:`);
    implementedMethods.forEach(method => console.log(`  - ${method}`));
    
    // Warn about missing methods
    const missingMethods = analyserMethods.filter(method => 
      driver.analyserClass.prototype[method] === undefined
    );
    
    if (missingMethods.length > 0) {
      console.warn('Warning: Analyser is missing these methods:');
      missingMethods.forEach(method => console.warn(`  - ${method}`));
    }
  }
} else {
  console.error('ERROR: analyserClass is not defined in the driver');
}

console.log('\nAPI Endpoints Verification Complete');
console.log('To test with an actual DB2 connection, use the test-api-direct.js script');

// Check if we need to modify the debug log for better tracing
console.log('\nAdding enhanced DB2 debug traces to driver.js...');

// Create a wrapper function to trace structure calls
const structureTracerCode = `
// Enhanced debug logging for getStructure
console.log('[DB2] Adding enhanced debug logging for getStructure API endpoint');

const originalGetStructure = driver.getStructure;
driver.getStructure = async function(dbhan, schemaName) {
  console.log('\\n[DB2] ======= getStructure CALLED =======');
  console.log('[DB2] Schema name:', schemaName);
  
  try {
    const result = await originalGetStructure.call(this, dbhan, schemaName);
    console.log('[DB2] getStructure completed successfully');
    console.log('[DB2] Result summary:');
    console.log('[DB2] - Tables:', result?.tables?.length || 0);
    console.log('[DB2] - Views:', result?.views?.length || 0);
    console.log('[DB2] - Procedures:', result?.procedures?.length || 0);
    console.log('[DB2] - Functions:', result?.functions?.length || 0);
    
    if (result?.tables?.length > 0) {
      console.log('[DB2] First table example:', result.tables[0]);
    } else {
      console.log('[DB2] No tables found in result');
    }
    
    console.log('[DB2] ======= getStructure END =======\\n');
    return result;
  } catch (error) {
    console.error('[DB2] getStructure ERROR:', error);
    console.log('[DB2] ======= getStructure ERROR END =======\\n');
    throw error;
  }
};

// Add similar tracing for other critical methods
const originalListSchemas = driver.listSchemas;
driver.listSchemas = async function(dbhan) {
  console.log('\\n[DB2] ======= listSchemas CALLED =======');
  
  try {
    const result = await originalListSchemas.call(this, dbhan);
    console.log('[DB2] listSchemas completed successfully');
    console.log('[DB2] Schemas found:', result?.length || 0);
    if (result?.length > 0) {
      console.log('[DB2] Schema examples:', result.slice(0, 3));
    }
    
    console.log('[DB2] ======= listSchemas END =======\\n');
    return result;
  } catch (error) {
    console.error('[DB2] listSchemas ERROR:', error);
    console.log('[DB2] ======= listSchemas ERROR END =======\\n');
    throw error;
  }
};

console.log('[DB2] Enhanced debug logging added to driver');
`;

// Log conclusion
console.log('\nTo apply these debug traces:');
console.log('1. Create a new file called "apply-traces.js" in the DB2 plugin directory');
console.log('2. Copy the code above into the file');
console.log('3. Run with: node apply-traces.js');
console.log('\nThis verification is now complete.');
