// DB2 Plugin Fix Implementation
// This script adds enhanced debug logging and implements fixes for the DB2 plugin

// Apply these changes to the DB2 plugin driver.js file to improve database object retrieval
// Place this in a file called install-db2-fix.js and run it with node

const fs = require('fs');
const path = require('path');

// Paths to the files that need modification
const driverPath = path.join(__dirname, 'src', 'backend', 'driver.js');
const fixedStructurePath = path.join(__dirname, 'src', 'backend', 'fixed-structure.js');
const caseHelperPath = path.join(__dirname, 'src', 'backend', 'case-helpers.js');

// Create a backup of the original files
function backupFile(filePath) {
  const backupPath = `${filePath}.backup-${Date.now()}`;
  fs.copyFileSync(filePath, backupPath);
  console.log(`Created backup of ${path.basename(filePath)} at ${path.basename(backupPath)}`);
  return backupPath;
}

// Enhance the getStructure method in driver.js
function enhanceDriverGetStructure() {
  console.log('Enhancing driver.js getStructure implementation...');
  
  const driverBackup = backupFile(driverPath);
  const driverContent = fs.readFileSync(driverPath, 'utf8');
  
  // Enhanced logging for getStructure method
  const enhancedGetStructureCode = `
  async getStructure(dbhan, schemaName) {
    try {
      console.log('[DB2] ====== Starting getStructure API call ======');
      console.log('[DB2] Getting structure for schema:', schemaName);
      console.log('[DB2] - /database-connections/structure API endpoint triggered');

      // Check if enhancedGetStructure is available and use it if possible
      if (typeof enhancedGetStructure === 'function') {
        try {
          console.log('[DB2] Using enhanced getStructure implementation');
          const result = await enhancedGetStructure(this, dbhan, schemaName);
          
          // Validate the structure result
          if (!result) {
            console.error('[DB2] Enhanced getStructure returned null/undefined');
          } else {
            console.log('[DB2] Enhanced getStructure returned:', {
              tables: (result.tables || []).length,
              views: (result.views || []).length,
              procedures: (result.procedures || []).length,
              functions: (result.functions || []).length
            });
            
            // Ensure all tables have the required properties
            if (result.tables && result.tables.length > 0) {
              result.tables = result.tables.map(table => {
                if (!table.pureName && table.tableName) table.pureName = table.tableName;
                if (!table.schemaName && schemaName) table.schemaName = schemaName;
                return table;
              });
              console.log('[DB2] Normalized table structure properties');
            }
          }
          
          console.log('[DB2] ====== Completed getStructure API call ======');
          return result;
        } catch (enhancedErr) {
          console.error('[DB2] Enhanced getStructure failed, falling back to default:', enhancedErr);
          // Continue with the default implementation below
        }
      }

      if (!schemaName) {
        console.warn('[DB2] No schema name provided, attempting to get current schema');
        try {
          const currentSchemaResult = await this.query(dbhan, \`
            SELECT CURRENT SCHEMA as schemaName FROM SYSIBM.SYSDUMMY1
          \`);
          
          // Handle case sensitivity with improved access method
          if (currentSchemaResult.rows && currentSchemaResult.rows.length > 0) {
            const row = currentSchemaResult.rows[0];
            schemaName = row.SCHEMANAME || row.schemaName || row.CURRENTSCHEMA || 
                       row["CURRENT SCHEMA"] || row["current schema"] || row.currentschema;
            console.log('[DB2] Using current schema:', schemaName);
          }
  `;
  
  // Replace the original getStructure method
  const updatedDriverContent = driverContent.replace(
    /async getStructure\(dbhan, schemaName\) {[\s\S]*?if \(!schemaName\) {[\s\S]*?console\.log\('\[DB2\] Using current schema:', schemaName\);/,
    enhancedGetStructureCode
  );
  
  // Enhanced finalizing of structure data
  const enhancedFinalizeStructure = `
      // Final cleanup and normalization
      const structure = {
        tables: tables || [],
        views: views || [],
        procedures: procedures || [],
        functions: functions || [],
        triggers: triggers || []
      };
      
      console.log('[DB2] Final structure result:', {
        tables: structure.tables.length,
        views: structure.views.length,
        procedures: structure.procedures.length,
        functions: structure.functions.length
      });
      
      if (structure.tables.length === 0) {
        console.warn('[DB2] No tables found in structure - this will cause UI to show empty schema');
      }
      
      // Final validation and normalization of table objects
      structure.tables = structure.tables.map(table => {
        // Ensure required properties exist for UI display
        if (!table.pureName && table.tableName) table.pureName = table.tableName;
        if (!table.schemaName) table.schemaName = schemaName || '';
        return table;
      });
      
      console.log('[DB2] ====== Completed getStructure API call ======');
      return structure;
  `;
  
  // Replace the final part of the structure return
  const updatedWithFinalStructure = updatedDriverContent.replace(
    /\/\/ Final structure[\s\S]*?return {[\s\S]*?tables[\s\S]*?views[\s\S]*?procedures[\s\S]*?functions[\s\S]*?triggers[\s\S]*?};/,
    enhancedFinalizeStructure
  );
  
  // Write updated content back to the file
  fs.writeFileSync(driverPath, updatedWithFinalStructure);
  console.log('Enhanced driver.js getStructure implementation');
}

// Enhance the fixed-structure.js implementation
function enhanceFixedStructure() {
  console.log('Enhancing fixed-structure.js implementation...');
  
  const structureBackup = backupFile(fixedStructurePath);
  const structureContent = fs.readFileSync(fixedStructurePath, 'utf8');
  
  // Better handling of schema case sensitivity
  const enhancedSchemaHandling = `
async function getStructure(driver, dbhan, schemaName) {
  try {
    console.log('[DB2] ====== Starting enhanced getStructure API call ======');
    console.log('[DB2] Getting structure for schema:', schemaName);

    if (!schemaName) {
      console.warn('[DB2] No schema name provided, attempting to get current schema');
      try {
        const currentSchemaResult = await driver.query(dbhan, \`
          SELECT CURRENT SCHEMA as schemaName FROM SYSIBM.SYSDUMMY1
        \`);
        
        const normalizedResult = normalizeQueryResult(currentSchemaResult);
        
        if (normalizedResult?.rows?.length > 0) {
          schemaName = getPropertyValue(
            normalizedResult.rows[0], 
            'schemaName', 'SCHEMANAME', 'CURRENT SCHEMA', 'current schema'
          );
          
          console.log(\`[DB2] Using current schema: \${schemaName}\`);
        } else {
          // Try with user name
          try {
            const userResult = await driver.query(dbhan, \`SELECT CURRENT USER as userName FROM SYSIBM.SYSDUMMY1\`);
            const normalized = normalizeQueryResult(userResult);
            
            if (normalized?.rows?.length > 0) {
              schemaName = getPropertyValue(normalized.rows[0], 'userName', 'USERNAME', 'CURRENT USER');
              console.log(\`[DB2] Using user name as schema: \${schemaName}\`);
            }
          } catch (userError) {
            console.error('[DB2] Error getting user name:', userError.message);
          }
        }
      } catch (err) {
        console.error('[DB2] Error getting current schema:', err.message);
      }
      
      // If we still don't have a schema, use a default
      if (!schemaName) {
        schemaName = 'DB2INST1'; // Common default
        console.log(\`[DB2] Using default schema: \${schemaName}\`);
      }
    }
    
    // Normalize the schema name to ensure consistent case
    schemaName = schemaName.toUpperCase();
    console.log(\`[DB2] Using normalized schema: \${schemaName}\`);
  `;
  
  // Replace the original getStructure function start
  const updatedStructureContent = structureContent.replace(
    /async function getStructure\(driver, dbhan, schemaName\) {[\s\S]*?if \(!schemaName\) {[\s\S]*?\/\/ Try with user name/,
    enhancedSchemaHandling
  );
  
  // Add better table query handling
  const enhancedTableQuery = `
    // Get tables
    console.log('[DB2] Querying for tables in schema:', schemaName);
    let tables = [];
    
    // Try multiple queries for tables, as system table structure may vary by DB2 version
    try {
      // First attempt - SYSCAT.TABLES (DB2 LUW)
      const tableQuery1 = \`
        SELECT 
          TABSCHEMA as "schemaName", 
          TABNAME as "tableName", 
          REMARKS as "tableComment",
          TYPE as "tableType",
          'T' as "objectType"
        FROM SYSCAT.TABLES
        WHERE TABSCHEMA = ?
        AND TYPE IN ('T', 'P')
        ORDER BY TABNAME
      \`;
      console.log('[DB2] Running SYSCAT.TABLES query');
      let tableResult = await driver.query(dbhan, tableQuery1, [schemaName]);
      let normalizedTableResult = normalizeQueryResult(tableResult);
      
      if (normalizedTableResult.rows && normalizedTableResult.rows.length > 0) {
        console.log(\`[DB2] Found \${normalizedTableResult.rows.length} tables in SYSCAT.TABLES\`);
        tables = normalizedTableResult.rows;
      } else {
        console.log('[DB2] No tables found in SYSCAT.TABLES, trying SYSIBM.SYSTABLES');
        
        // Second attempt - SYSIBM.SYSTABLES (DB2 for z/OS) 
        const tableQuery2 = \`
          SELECT 
            CREATOR as "schemaName", 
            NAME as "tableName", 
            REMARKS as "tableComment",
            TYPE as "tableType", 
            'T' as "objectType"
          FROM SYSIBM.SYSTABLES
          WHERE CREATOR = ?
          AND TYPE IN ('T', 'P')
          ORDER BY NAME
        \`;
        
        tableResult = await driver.query(dbhan, tableQuery2, [schemaName]);
        normalizedTableResult = normalizeQueryResult(tableResult);
        
        if (normalizedTableResult.rows && normalizedTableResult.rows.length > 0) {
          console.log(\`[DB2] Found \${normalizedTableResult.rows.length} tables in SYSIBM.SYSTABLES\`);
          tables = normalizedTableResult.rows;
        } else {
          console.log('[DB2] No tables found in SYSIBM.SYSTABLES, trying SYSCOLUMNS approach');
          
          // Third attempt - SYSCOLUMNS-based approach
          // This works by getting distinct table names from the columns catalog
          const tableQuery3 = \`
            SELECT DISTINCT
              TBCREATOR as "schemaName",
              TBNAME as "tableName",
              'T' as "objectType"
            FROM SYSIBM.SYSCOLUMNS
            WHERE TBCREATOR = ?
            ORDER BY TBNAME
          \`;
          
          tableResult = await driver.query(dbhan, tableQuery3, [schemaName]);
          normalizedTableResult = normalizeQueryResult(tableResult);
          
          if (normalizedTableResult.rows && normalizedTableResult.rows.length > 0) {
            console.log(\`[DB2] Found \${normalizedTableResult.rows.length} tables via SYSCOLUMNS\`);
            tables = normalizedTableResult.rows;
          } else {
            console.warn('[DB2] No tables found using any catalog query');
          }
        }
      }
      
      // Ensure tables have the expected format for UI display
      tables = tables.map(table => ({
        ...table,
        pureName: table.tableName,  // Required for UI
        objectType: table.objectType || 'T'
      }));
      
      console.log(\`[DB2] Final table count: \${tables.length}\`);
      
    } catch (tableError) {
      console.error('[DB2] Error retrieving tables:', tableError);
      tables = []; // Set empty tables array on error
    }
  `;
  
  // Find where tables are queried and replace with enhanced version
  const updatedWithTableQuery = updatedStructureContent.replace(
    /\/\/ Get tables[\s\S]*?let tables = \[\];[\s\S]*?try {[\s\S]*?const tableQuery/,
    enhancedTableQuery + '\n    // Original table query follows but will not be used'
  );
  
  // Write updated content back to the file
  fs.writeFileSync(fixedStructurePath, updatedWithTableQuery);
  console.log('Enhanced fixed-structure.js implementation');
}

// Enhance the case-helpers.js implementation
function enhanceCaseHelpers() {
  console.log('Enhancing case-helpers.js implementation...');
  
  const helpersBackup = backupFile(caseHelperPath);
  const helpersContent = fs.readFileSync(caseHelperPath, 'utf8');
  
  // Enhanced property getter with better case handling
  const enhancedPropertyGetter = `
// Enhanced property getter with case insensitivity
function getPropertyValue(obj, ...possibleNames) {
  if (!obj) return undefined;
  
  // Try exact matches first
  for (const name of possibleNames) {
    if (obj[name] !== undefined) return obj[name];
  }
  
  // Try case-insensitive matches
  const objKeys = Object.keys(obj);
  for (const name of possibleNames) {
    const lowerName = name.toLowerCase();
    const upperName = name.toUpperCase();
    
    // Check for matches when converting to lowercase
    const lowerMatch = objKeys.find(k => k.toLowerCase() === lowerName);
    if (lowerMatch && obj[lowerMatch] !== undefined) return obj[lowerMatch];
    
    // Check for matches when converting to uppercase
    const upperMatch = objKeys.find(k => k.toUpperCase() === upperName);
    if (upperMatch && obj[upperMatch] !== undefined) return obj[upperMatch];
  }
  
  return undefined;
}  
  `;
  
  // Replace the original getPropertyValue function
  const updatedHelpersContent = helpersContent.replace(
    /\/\/ Original property getter[\s\S]*?function getPropertyValue[\s\S]*?return undefined;\s*}/,
    enhancedPropertyGetter
  );
  
  // Add enhanced normalizing function
  const enhancedNormalizeQuery = `
// Enhanced query result normalizer
function normalizeQueryResult(result) {
  if (!result) return { rows: [] };
  
  // Copy the result to avoid modifying the original
  const normalized = { ...result };
  
  if (normalized.rows && Array.isArray(normalized.rows)) {
    normalized.rows = normalized.rows.map(row => normalizeRow(row));
  } else {
    normalized.rows = [];
  }
  
  // Ensure no null/undefined values
  normalized.rows = normalized.rows.filter(row => row !== null && row !== undefined);
  
  return normalized;
}

// Enhanced row normalizer
function normalizeRow(row) {
  if (!row) return {};
  
  // Create a normalized copy
  const normalized = {};
  
  // Process each property, consistently handling case for key DB2 fields
  Object.keys(row).forEach(key => {
    // Store both the original case and a normalized lowercase version
    normalized[key] = row[key];
    
    // Specific handling for common DB2 column names
    const lowerKey = key.toLowerCase();
    if (
      lowerKey === 'schemaname' || 
      lowerKey === 'tablename' || 
      lowerKey === 'viewname' || 
      lowerKey === 'procname' ||
      lowerKey === 'colname' ||
      lowerKey === 'type' ||
      lowerKey === 'objecttype'
    ) {
      // Add camelCase version if it doesn't exist already
      const camelKey = lowerKey.replace(/(?:^|_)([a-z])/g, (_, letter) => letter.toUpperCase());
      if (!normalized[camelKey]) {
        normalized[camelKey] = row[key];
      }
    }
    
    // Map specific catalog fields to expected UI property names
    if (lowerKey === 'tabschema') normalized.schemaName = row[key];
    if (lowerKey === 'tabname') normalized.tableName = row[key];
    if (lowerKey === 'creator') normalized.schemaName = row[key];
    if (lowerKey === 'name' && !normalized.tableName) normalized.tableName = row[key];
  });
  
  // Ensure critical properties for UI exist
  if (normalized.tableName && !normalized.pureName) {
    normalized.pureName = normalized.tableName;
  }
  
  return normalized;
}
  `;
  
  // Replace the original normalize functions
  const finalHelpersContent = updatedHelpersContent.replace(
    /function normalizeQueryResult[\s\S]*?return normalized;\s*}\s*function normalizeRow[\s\S]*?return normalized;\s*}/,
    enhancedNormalizeQuery
  );
  
  // Write updated content back to the file
  fs.writeFileSync(caseHelperPath, finalHelpersContent);
  console.log('Enhanced case-helpers.js implementation');
}

// Main execution
console.log('=== Installing DB2 Plugin Fixes ===');

try {
  enhanceDriverGetStructure();
  enhanceFixedStructure();
  enhanceCaseHelpers();
  
  console.log('\n✅ DB2 Plugin Fix Installation Complete!');
  console.log('The fixes have been applied to:');
  console.log('- driver.js: Enhanced getStructure method with better debugging and error handling');
  console.log('- fixed-structure.js: Improved schema and table handling for different DB2 versions');
  console.log('- case-helpers.js: Enhanced property access with better case handling');
  
  console.log('\nInstructions:');
  console.log('1. Restart DbGate');
  console.log('2. Use the browser-debug.js script to monitor API calls');
  console.log('3. Connect to your DB2 database and verify that objects are now visible');
  
} catch (error) {
  console.error('❌ Error applying DB2 fixes:', error);
}
