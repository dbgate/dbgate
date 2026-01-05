/**
 * Test script to verify the display of DB2 procedures and functions in the UI
 */

const { createConnection } = require('ibm_db');

// Mock DB2 connection
const mockConnection = {
  server: 'localhost',
  port: 50000,
  database: 'sample',
  user: 'db2inst1',
  password: 'password',
  __mockMode: true // Flag to indicate mock mode for testing
};

// Import driver for testing
const driver = require('./src/backend/driver');

async function testProceduresFunctionsDisplay() {
  console.log('==== Testing Procedures and Functions Display Fix ====');
  
  // Add event emitter for mock query responses
  driver.query = async function(conn, sql, params) {
    console.log(`[MOCK QUERY] ${sql}`);
    
    // Mock responses for different queries
    if (sql.includes('ROUTINETYPE = \'F\'')) {
      console.log('[MOCK] Returning functions data');
      return {
        rows: [
          {
            ROUTINESCHEMA: 'TESTSCHEMA',
            ROUTINENAME: 'TEST_FUNCTION1',
            REMARKS: 'Test function 1',
            TEXT: 'CREATE OR REPLACE FUNCTION TEST_FUNCTION1() RETURNS VARCHAR(100) BEGIN RETURN \'test\'; END',
            PARAMETER_STYLE: 'SQL',
            LANGUAGE: 'SQL',
            RETURN_TYPESCHEMA: 'SYSIBM',
            RETURN_TYPENAME: 'VARCHAR',
            CREATE_TIME: new Date('2023-01-01'),
            ALTER_TIME: new Date('2023-02-01')
          },
          {
            ROUTINESCHEMA: 'TESTSCHEMA',
            ROUTINENAME: 'TEST_FUNCTION2',
            REMARKS: 'Test function 2',
            TEXT: 'CREATE OR REPLACE FUNCTION TEST_FUNCTION2() RETURNS INTEGER BEGIN RETURN 1; END',
            PARAMETER_STYLE: 'SQL',
            LANGUAGE: 'SQL',
            RETURN_TYPESCHEMA: 'SYSIBM',
            RETURN_TYPENAME: 'INTEGER',
            CREATE_TIME: new Date('2023-01-01'),
            ALTER_TIME: null
          }
        ]
      };
    }
    
    if (sql.includes('ROUTINETYPE = \'P\'')) {
      console.log('[MOCK] Returning procedures data');
      return {
        rows: [
          {
            ROUTINESCHEMA: 'TESTSCHEMA',
            ROUTINENAME: 'TEST_PROCEDURE1',
            REMARKS: 'Test procedure 1',
            TEXT: 'CREATE OR REPLACE PROCEDURE TEST_PROCEDURE1() BEGIN END',
            PARAMETER_STYLE: 'SQL',
            LANGUAGE: 'SQL',
            CREATE_TIME: new Date('2023-01-01'),
            ALTER_TIME: new Date('2023-02-01')
          },
          {
            ROUTINESCHEMA: 'TESTSCHEMA',
            ROUTINENAME: 'TEST_PROCEDURE2',
            REMARKS: 'Test procedure 2',
            TEXT: 'CREATE OR REPLACE PROCEDURE TEST_PROCEDURE2() BEGIN END',
            PARAMETER_STYLE: 'SQL',
            LANGUAGE: 'SQL',
            CREATE_TIME: new Date('2023-01-01'),
            ALTER_TIME: null
          }
        ]
      };
    }
    
    if (sql.includes('CURRENT SCHEMA')) {
      return {
        rows: [
          {
            SCHEMANAME: 'TESTSCHEMA'
          }
        ]
      };
    }
    
    // For parameter queries
    if (sql.includes('SYSCAT.ROUTINEPARMS')) {
      return {
        rows: []
      };
    }
    
    return { rows: [] };
  };
  
  try {
    console.log('\n1. Testing getStructure method:');
    const structure = await driver.getStructure(mockConnection, 'TESTSCHEMA');
    
    console.log('\nFunctions found:');
    if (structure.functions && structure.functions.length > 0) {
      structure.functions.forEach(func => {
        console.log(`- ${func.schemaName}.${func.pureName}`);
        console.log(`  displayName: ${func.displayName}`);
        console.log(`  functionName: ${func.functionName}`);
        console.log(`  name: ${func.name}`);
      });
    } else {
      console.log('No functions found.');
    }
    
    console.log('\nProcedures found:');
    if (structure.procedures && structure.procedures.length > 0) {
      structure.procedures.forEach(proc => {
        console.log(`- ${proc.schemaName}.${proc.pureName}`);
        console.log(`  displayName: ${proc.displayName}`);
        console.log(`  procedureName: ${proc.procedureName}`);
        console.log(`  name: ${proc.name}`);
      });
    } else {
      console.log('No procedures found.');
    }
    
    // Verify that all required properties for UI display are present
    const requiredProps = ['displayName', 'pureName', 'name'];
    const functionCheck = requiredProps.every(prop => structure.functions[0][prop]);
    const procedureCheck = requiredProps.every(prop => structure.procedures[0][prop]);
    
    if (functionCheck && procedureCheck) {
      console.log('\nSUCCESS: All required properties for UI display are present!');
    } else {
      console.error('\nERROR: Missing required properties for UI display!');
      if (!functionCheck) {
        console.error('Functions are missing properties:', 
          requiredProps.filter(prop => !structure.functions[0][prop]));
      }
      if (!procedureCheck) {
        console.error('Procedures are missing properties:', 
          requiredProps.filter(prop => !structure.procedures[0][prop]));
      }
    }
    
  } catch (error) {
    console.error('Test error:', error);
  }
}

// Run the test if called directly
if (require.main === module) {
  testProceduresFunctionsDisplay().catch(console.error);
}

module.exports = { testProceduresFunctionsDisplay };
