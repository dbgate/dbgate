/**
 * Enhanced implementation of getStructure method for DB2 driver
 * This fixes the issue with undefined table values in logs
 */

const { normalizeRow, getPropertyValue, normalizeQueryResult } = require('./case-helpers');

// Enhanced getStructure implementation
async function getStructure(driver, dbhan, schemaName) {
  try {
    console.log('[DB2] ====== Starting enhanced getStructure API call ======');
    console.log('[DB2] Getting structure for schema:', schemaName);

    if (!schemaName) {
      console.warn('[DB2] No schema name provided, attempting to get current schema');
      try {
        const currentSchemaResult = await driver.query(dbhan, `
          SELECT CURRENT SCHEMA as schemaName FROM SYSIBM.SYSDUMMY1
        `);
        
        const normalizedResult = normalizeQueryResult(currentSchemaResult);
        
        if (normalizedResult?.rows?.length > 0) {
          schemaName = getPropertyValue(
            normalizedResult.rows[0], 
            'schemaName', 'SCHEMANAME', 'CURRENT SCHEMA', 'current schema'
          );
          
          console.log(`[DB2] Using current schema: ${schemaName}`);
        } else {
          // Try with user name
          try {
            const userResult = await driver.query(dbhan, `
              SELECT CURRENT USER as userName FROM SYSIBM.SYSDUMMY1
            `);
            
            const normalizedUserResult = normalizeQueryResult(userResult);
            
            if (normalizedUserResult?.rows?.length > 0) {
              schemaName = getPropertyValue(
                normalizedUserResult.rows[0],
                'userName', 'USERNAME', 'CURRENT USER', 'current user'
              );
              
              console.log(`[DB2] Using user's name as schema: ${schemaName}`);
            } else {
              // Final fallback
              schemaName = 'DB2INST1';
              console.log(`[DB2] Using default schema: ${schemaName}`);
            }
          } catch (userErr) {
            schemaName = 'DB2INST1';
            console.log(`[DB2] Using default schema after user error: ${schemaName}`);
          }
        }
      } catch (err) {
        console.error('[DB2] Error determining current schema:', err);
        schemaName = 'DB2INST1';
        console.log(`[DB2] Using default schema after error: ${schemaName}`);
      }
    }

    // Schema verification (optional)
    let schemaExists = false;
    try {
      const schemaCheck = await driver.query(dbhan, `
        SELECT 1 
        FROM SYSCAT.SCHEMATA 
        WHERE SCHEMANAME = ?
      `, [schemaName]);

      schemaExists = schemaCheck.rows && schemaCheck.rows.length > 0;
    } catch (err) {
      console.error('[DB2] Error checking schema existence:', err);
    }

    if (!schemaExists) {
      console.log(`[DB2] Schema ${schemaName} not verified. Continuing anyway.`);
      // Note: We continue anyway because sometimes the schema catalog view is inaccessible
      // but the schema exists and is usable
    }

    // Get tables with enhanced error handling and property mapping
    let tables = [];
    try {
      const tablesQuery = `
        SELECT 
          t.TABSCHEMA as schemaName,
          t.TABNAME as tableName,
          t.REMARKS as description,
          t.TYPE as tableType,
          t.CREATE_TIME as createTime,
          t.ALTER_TIME as alterTime,
          (SELECT COUNT(*) FROM SYSCAT.COLUMNS c 
           WHERE c.TABSCHEMA = t.TABSCHEMA AND c.TABNAME = t.TABNAME) as columnCount
        FROM SYSCAT.TABLES t
        WHERE t.TABSCHEMA = ?
        AND t.TYPE = 'T'
        ORDER BY t.TABNAME
      `;
      
      console.log(`[DB2] Running table query for schema ${schemaName}`);
      const tablesRes = await driver.query(dbhan, tablesQuery, [schemaName]);
      
      // Debug the raw results
      console.log(`[DB2] Raw table query returned ${tablesRes.rows?.length || 0} rows`);
      if (tablesRes.rows && tablesRes.rows.length > 0) {
        console.log(`[DB2] First row sample:`, JSON.stringify(tablesRes.rows[0], null, 2));
      }
      
      // Process and normalize each row
      tables = (tablesRes.rows || []).map(row => {
        // Normalize the row first to ensure case-insensitive access
        const normalizedRow = normalizeRow(row);
        
        // Extract values using our helper function for guaranteed access
        const schemaName = getPropertyValue(normalizedRow, 'schemaName', 'TABSCHEMA', 'tabschema');
        const tableName = getPropertyValue(normalizedRow, 'tableName', 'TABNAME', 'tabname');
        
        console.log(`[DB2] Processing table: ${schemaName}.${tableName}`);
        
        return {
          schemaName: schemaName,
          pureName: tableName,
          objectType: 'table',
          objectId: `${schemaName}.${tableName}`,
          description: getPropertyValue(normalizedRow, 'description', 'REMARKS', 'remarks'),
          tableType: getPropertyValue(normalizedRow, 'tableType', 'TYPE', 'type') || 'T',
          createTime: getPropertyValue(normalizedRow, 'createTime', 'CREATE_TIME', 'create_time'),
          alterTime: getPropertyValue(normalizedRow, 'alterTime', 'ALTER_TIME', 'alter_time'),
          columnCount: getPropertyValue(normalizedRow, 'columnCount', 'COLUMNCOUNT', 'columncount'),
          contentHash: getPropertyValue(normalizedRow, 'alterTime', 'ALTER_TIME')?.toISOString() || 
                       getPropertyValue(normalizedRow, 'createTime', 'CREATE_TIME')?.toISOString() || 
                       `${schemaName}.${tableName}`,
          displayName: tableName,
          isView: false,
          isTable: true
        };
      });
      
      // Output the tables found for debugging
      console.log(`[DB2] Found ${tables.length} tables in schema ${schemaName}`);
      if (tables.length > 0) {
        console.log(`[DB2] First mapped table:`, tables[0]);
      }
      
      // FETCH COLUMN INFORMATION FOR TABLES
      console.log(`[DB2] Fetching column information for ${tables.length} tables`);
      
      // Create columns map to store column info for each table
      const tableColumns = {};
      
      // Query to get all columns for all tables in the schema in one go (more efficient)
      const columnsQuery = `
        SELECT 
          c.TABSCHEMA as schemaName, 
          c.TABNAME as tableName, 
          c.COLNAME as columnName, 
          c.TYPENAME as dataType,
          c.LENGTH as length,
          c.SCALE as scale,
          c.DEFAULT as defaultValue,
          c.REMARKS as description,
          c.NULLS as isNullable,
          c.COLNO as columnNo,
          c.IDENTITY as isIdentity,
          c.KEYSEQ as primaryKey
        FROM SYSCAT.COLUMNS c
        WHERE c.TABSCHEMA = ?
        ORDER BY c.TABNAME, c.COLNO
      `;
      
      try {
        const columnsRes = await driver.query(dbhan, columnsQuery, [schemaName]);
        console.log(`[DB2] Retrieved ${columnsRes.rows?.length || 0} total columns`);
        
        // Process columns and organize by table
        (columnsRes.rows || []).forEach(row => {
          const normalizedRow = normalizeRow(row);
          
          const tableSchema = getPropertyValue(normalizedRow, 'schemaName', 'TABSCHEMA', 'tabschema');
          const tableName = getPropertyValue(normalizedRow, 'tableName', 'TABNAME', 'tabname');
          const columnName = getPropertyValue(normalizedRow, 'columnName', 'COLNAME', 'colname');
          const tableKey = `${tableSchema}.${tableName}`;
          
          // Initialize array for this table if not exists
          if (!tableColumns[tableKey]) {
            tableColumns[tableKey] = [];
          }
          
          // Add column information
          tableColumns[tableKey].push({
            pureName: columnName,
            columnName: columnName,
            dataType: getPropertyValue(normalizedRow, 'dataType', 'TYPENAME', 'typename'),
            length: getPropertyValue(normalizedRow, 'length', 'LENGTH', 'length'),
            precision: getPropertyValue(normalizedRow, 'length', 'LENGTH', 'length'),
            scale: getPropertyValue(normalizedRow, 'scale', 'SCALE', 'scale'),
            notNull: getPropertyValue(normalizedRow, 'isNullable', 'NULLS', 'nulls') === 'N',
            autoIncrement: getPropertyValue(normalizedRow, 'isIdentity', 'IDENTITY', 'identity') === 'Y',
            defaultValue: getPropertyValue(normalizedRow, 'defaultValue', 'DEFAULT', 'default'),
            isPrimaryKey: !!getPropertyValue(normalizedRow, 'primaryKey', 'KEYSEQ', 'keyseq'),
            ordinalPosition: getPropertyValue(normalizedRow, 'columnNo', 'COLNO', 'colno'),
            description: getPropertyValue(normalizedRow, 'description', 'REMARKS', 'remarks')
          });
        });
        
        // Add column information to each table
        tables = tables.map(table => {
          const tableKey = `${table.schemaName}.${table.pureName}`;
          const columns = tableColumns[tableKey] || [];
          return {
            ...table,
            columns
          };
        });
        
        console.log(`[DB2] Added column information to tables. First table now has ${tables[0]?.columns?.length || 0} columns`);
      } catch (columnsErr) {
        console.error(`[DB2] Error getting column information: ${columnsErr.message}`);
        console.error(columnsErr);
      }
    } catch (tableErr) {
      console.error(`[DB2] Error getting tables: ${tableErr.message}`);
      console.error(tableErr);
    }

    // Get views with enhanced property mapping
    let views = [];
    try {
      const viewsQuery = `
        SELECT 
          v.VIEWSCHEMA as schemaName,
          v.VIEWNAME as viewName,
          v.REMARKS as description,
          v.TEXT as definition,
          v.CREATE_TIME as createTime,
          v.ALTER_TIME as alterTime
        FROM SYSCAT.VIEWS v
        WHERE v.VIEWSCHEMA = ?
        ORDER BY v.VIEWNAME
      `;
      
      console.log(`[DB2] Running views query for schema ${schemaName}`);
      const viewsRes = await driver.query(dbhan, viewsQuery, [schemaName]);
      
      views = (viewsRes.rows || []).map(row => {
        const normalizedRow = normalizeRow(row);
        
        const schemaName = getPropertyValue(normalizedRow, 'schemaName', 'VIEWSCHEMA', 'viewschema');
        const viewName = getPropertyValue(normalizedRow, 'viewName', 'VIEWNAME', 'viewname');
        
        return {
          schemaName: schemaName,
          pureName: viewName,
          objectType: 'view',
          objectId: `${schemaName}.${viewName}`,
          description: getPropertyValue(normalizedRow, 'description', 'REMARKS', 'remarks'),
          definition: getPropertyValue(normalizedRow, 'definition', 'TEXT', 'text'),
          createTime: getPropertyValue(normalizedRow, 'createTime', 'CREATE_TIME', 'create_time'),
          alterTime: getPropertyValue(normalizedRow, 'alterTime', 'ALTER_TIME', 'alter_time'),
          contentHash: getPropertyValue(normalizedRow, 'definition', 'TEXT', 'text') || 
                       getPropertyValue(normalizedRow, 'alterTime', 'ALTER_TIME')?.toISOString() || 
                       getPropertyValue(normalizedRow, 'createTime', 'CREATE_TIME')?.toISOString() || 
                       `${schemaName}.${viewName}`,
          displayName: viewName,
          isView: true,
          isTable: false
        };
      });
      
      console.log(`[DB2] Found ${views.length} views in schema ${schemaName}`);
      
      // FETCH COLUMNS FOR VIEWS
      if (views.length > 0) {
        console.log(`[DB2] Fetching column information for ${views.length} views`);
        
        // Create columns map to store column info for each view
        const viewColumns = {};
        
        // Query to get all columns for all views in the schema
        const viewColumnsQuery = `
          SELECT 
            c.TABSCHEMA as schemaName, 
            c.TABNAME as viewName, 
            c.COLNAME as columnName, 
            c.TYPENAME as dataType,
            c.LENGTH as length,
            c.SCALE as scale,
            c.DEFAULT as defaultValue,
            c.REMARKS as description,
            c.NULLS as isNullable,
            c.COLNO as columnNo
          FROM SYSCAT.COLUMNS c
          JOIN SYSCAT.VIEWS v ON c.TABSCHEMA = v.VIEWSCHEMA AND c.TABNAME = v.VIEWNAME
          WHERE c.TABSCHEMA = ?
          ORDER BY c.TABNAME, c.COLNO
        `;
        
        try {
          const viewColumnsRes = await driver.query(dbhan, viewColumnsQuery, [schemaName]);
          console.log(`[DB2] Retrieved ${viewColumnsRes.rows?.length || 0} total view columns`);
          
          // Process columns and organize by view
          (viewColumnsRes.rows || []).forEach(row => {
            const normalizedRow = normalizeRow(row);
            
            const viewSchema = getPropertyValue(normalizedRow, 'schemaName', 'TABSCHEMA', 'tabschema');
            const viewName = getPropertyValue(normalizedRow, 'viewName', 'TABNAME', 'tabname', 'viewname');
            const columnName = getPropertyValue(normalizedRow, 'columnName', 'COLNAME', 'colname');
            const viewKey = `${viewSchema}.${viewName}`;
            
            // Initialize array for this view if not exists
            if (!viewColumns[viewKey]) {
              viewColumns[viewKey] = [];
            }
            
            // Add column information
            viewColumns[viewKey].push({
              pureName: columnName,
              columnName: columnName,
              dataType: getPropertyValue(normalizedRow, 'dataType', 'TYPENAME', 'typename'),
              length: getPropertyValue(normalizedRow, 'length', 'LENGTH', 'length'),
              precision: getPropertyValue(normalizedRow, 'length', 'LENGTH', 'length'),
              scale: getPropertyValue(normalizedRow, 'scale', 'SCALE', 'scale'),
              notNull: getPropertyValue(normalizedRow, 'isNullable', 'NULLS', 'nulls') === 'N',
              defaultValue: getPropertyValue(normalizedRow, 'defaultValue', 'DEFAULT', 'default'),
              ordinalPosition: getPropertyValue(normalizedRow, 'columnNo', 'COLNO', 'colno'),
              description: getPropertyValue(normalizedRow, 'description', 'REMARKS', 'remarks')
            });
          });
          
          // Add column information to each view
          views = views.map(view => {
            const viewKey = `${view.schemaName}.${view.pureName}`;
            const columns = viewColumns[viewKey] || [];
            return {
              ...view,
              columns
            };
          });
          
          console.log(`[DB2] Added column information to views. First view now has ${views[0]?.columns?.length || 0} columns`);
        } catch (viewColumnsErr) {
          console.error(`[DB2] Error getting view column information: ${viewColumnsErr.message}`);
          console.error(viewColumnsErr);
        }
      }
    } catch (viewErr) {
      console.error(`[DB2] Error getting views: ${viewErr.message}`);
    }

    // Get procedures
    let procedures = [];
    try {
      // Get procedures from SYSCAT.ROUTINES
      const proceduresQuery = `
        SELECT 
          ROUTINESCHEMA as schemaName,
          ROUTINENAME as procedureName,
          REMARKS as description,
          TEXT as definition,
          PARAMETER_STYLE as parameterStyle,
          LANGUAGE as language,
          CREATE_TIME as createTime,
          ALTER_TIME as alterTime
        FROM SYSCAT.ROUTINES 
        WHERE ROUTINETYPE = 'P'
        AND ROUTINESCHEMA = ?
        ORDER BY ROUTINENAME
      `;
      
      console.log(`[DB2] Running procedures query for schema ${schemaName}`);
      const proceduresRes = await driver.query(dbhan, proceduresQuery, [schemaName]);
      
      procedures = (proceduresRes.rows || []).map(row => {
        const normalizedRow = normalizeRow(row);
        
        const schemaName = getPropertyValue(normalizedRow, 'schemaName', 'ROUTINESCHEMA', 'routineschema');
        const procName = getPropertyValue(normalizedRow, 'procedureName', 'ROUTINENAME', 'routinename');
        
        return {
          schemaName: schemaName,
          pureName: procName,
          objectType: 'procedure',
          objectId: `${schemaName}.${procName}`,
          description: getPropertyValue(normalizedRow, 'description', 'REMARKS', 'remarks'),
          definition: getPropertyValue(normalizedRow, 'definition', 'TEXT', 'text'),
          parameterStyle: getPropertyValue(normalizedRow, 'parameterStyle', 'PARAMETER_STYLE', 'parameter_style'),
          language: getPropertyValue(normalizedRow, 'language', 'LANGUAGE'),
          createTime: getPropertyValue(normalizedRow, 'createTime', 'CREATE_TIME', 'create_time'),
          alterTime: getPropertyValue(normalizedRow, 'alterTime', 'ALTER_TIME', 'alter_time'),
          contentHash: getPropertyValue(normalizedRow, 'definition', 'TEXT', 'text') || 
                       getPropertyValue(normalizedRow, 'alterTime', 'ALTER_TIME')?.toISOString() || 
                       getPropertyValue(normalizedRow, 'createTime', 'CREATE_TIME')?.toISOString() || 
                       `${schemaName}.${procName}`,
          displayName: procName
        };
      });
      
      console.log(`[DB2] Found ${procedures.length} procedures in schema ${schemaName}`);
    } catch (procErr) {
      console.error(`[DB2] Error getting procedures: ${procErr.message}`);
    }

    // Get functions with enhanced property mapping
    let functions = [];
    try {
      // Get functions from SYSCAT.ROUTINES
      const functionsQuery = `
        SELECT 
          ROUTINESCHEMA as schemaName,
          ROUTINENAME as functionName,
          REMARKS as description,
          TEXT as definition,
          RETURN_TYPE as returnType,
          PARAMETER_STYLE as parameterStyle,
          LANGUAGE as language,
          CREATE_TIME as createTime,
          ALTER_TIME as alterTime
        FROM SYSCAT.ROUTINES 
        WHERE ROUTINETYPE = 'F'
        AND ROUTINESCHEMA = ?
        ORDER BY ROUTINENAME
      `;
      
      console.log(`[DB2] Running functions query for schema ${schemaName}`);
      const functionsRes = await driver.query(dbhan, functionsQuery, [schemaName]);
      
      functions = (functionsRes.rows || []).map(row => {
        const normalizedRow = normalizeRow(row);
        
        const schemaName = getPropertyValue(normalizedRow, 'schemaName', 'ROUTINESCHEMA', 'routineschema');
        const funcName = getPropertyValue(normalizedRow, 'functionName', 'ROUTINENAME', 'routinename');
        
        return {
          schemaName: schemaName,
          pureName: funcName,
          objectType: 'function',
          objectId: `${schemaName}.${funcName}`,
          description: getPropertyValue(normalizedRow, 'description', 'REMARKS', 'remarks'),
          definition: getPropertyValue(normalizedRow, 'definition', 'TEXT', 'text'),
          returnType: getPropertyValue(normalizedRow, 'returnType', 'RETURN_TYPE', 'return_type'),
          parameterStyle: getPropertyValue(normalizedRow, 'parameterStyle', 'PARAMETER_STYLE', 'parameter_style'),
          language: getPropertyValue(normalizedRow, 'language', 'LANGUAGE'),
          createTime: getPropertyValue(normalizedRow, 'createTime', 'CREATE_TIME', 'create_time'),
          alterTime: getPropertyValue(normalizedRow, 'alterTime', 'ALTER_TIME', 'alter_time'),
          contentHash: getPropertyValue(normalizedRow, 'definition', 'TEXT', 'text') || 
                       getPropertyValue(normalizedRow, 'alterTime', 'ALTER_TIME')?.toISOString() || 
                       getPropertyValue(normalizedRow, 'createTime', 'CREATE_TIME')?.toISOString() || 
                       `${schemaName}.${funcName}`,
          displayName: funcName
        };
      });
      
      console.log(`[DB2] Found ${functions.length} functions in schema ${schemaName}`);
    } catch (funcErr) {
      console.error(`[DB2] Error getting functions: ${funcErr.message}`);
    }

    // Compose the final structure result
    const schemaInfo = { name: schemaName };
    const structure = {
      schemaInfo,
      tables,
      views,
      functions,
      procedures
    };

    // Log the final structure summary
    console.log('[DB2] Structure analysis complete:', {
      schemaName: schemaName,
      tableCount: tables.length,
      viewCount: views.length,
      functionCount: functions.length,
      procedureCount: procedures.length,
      tableColumnsCount: tables.reduce((total, table) => total + (table.columns?.length || 0), 0),
      viewColumnsCount: views.reduce((total, view) => total + (view.columns?.length || 0), 0)
    });

    console.log('[DB2] ====== Completed enhanced getStructure API call ======');
    return structure;
  } catch (err) {
    console.error('[DB2] Error in enhanced getStructure:', err);
    
    // Return a minimal structure instead of throwing to avoid breaking the UI
    return {
      schemaInfo: { name: schemaName || 'unknown' },
      tables: [],
      views: [],
      functions: [],
      procedures: []
    };
  }
}

module.exports = {
  getStructure
};
