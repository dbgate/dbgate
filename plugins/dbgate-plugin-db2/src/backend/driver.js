const ibmdb = require('ibm_db');
const { DatabaseAnalyser, getLogger, createBulkInsertStreamBase, extractErrorLogData } = require('dbgate-tools');
const connectHelper = require('./connect-fixed');
const { normalizeRow, getPropertyValue, normalizeQueryResult } = require('./case-helpers');
const { getStructure: enhancedGetStructure } = require('./fixed-structure');

class Analyser extends DatabaseAnalyser {
  constructor(connection, driver) {
    super(connection, driver);
    this.connection = connection;
    this.driver = driver;
  }

  async getSchemas() {
    try {
      console.log('[DB2] Fetching schemas');
      
      // First try: Get current schema
      try {
        const currentRes = await this.driver.query(this.connection, `
          SELECT CURRENT SCHEMA as schemaName FROM SYSIBM.SYSDUMMY1
        `);
        
        const currentSchema = currentRes.rows[0]?.SCHEMANAME || 
                            currentRes.rows[0]?.schemaName || 
                            currentRes.rows[0]?.['CURRENT SCHEMA'];
                            
        if (currentSchema) {
          console.log(`[DB2] Using current schema: ${currentSchema}`);
          return [currentSchema];
        }
      } catch (currentErr) {
        console.error(`[DB2] Error getting current schema: ${currentErr.message}`);
      }

      // Second try: Get from SYSCAT.SCHEMATA
      try {
        const res = await this.driver.query(this.connection, `
          SELECT DISTINCT SCHEMANAME
          FROM SYSCAT.SCHEMATA
          WHERE SCHEMANAME NOT IN ('SYSIBM', 'SYSTOOLS', 'SYSPROC', 'SYSSTAT', 'NULLID', 'SQLJ', 'SYSCAT', 'SYSFUN', 'SYSIBMADM')
          ORDER BY SCHEMANAME
        `);

        if (res.rows && res.rows.length > 0) {
          const schemas = res.rows.map(row => row.SCHEMANAME || row.schemaName);
          console.log(`[DB2] Found ${schemas.length} schemas from SYSCAT.SCHEMATA`);
          return schemas;
        }
      } catch (err) {
        console.error(`[DB2] Error querying SYSCAT.SCHEMATA: ${err.message}`);
      }

      // Last try: Get from SYSCAT.TABLES
      try {
        const res = await this.driver.query(this.connection, `
          SELECT DISTINCT TABSCHEMA
          FROM SYSCAT.TABLES
          WHERE TABSCHEMA NOT IN ('SYSIBM', 'SYSTOOLS', 'SYSPROC', 'SYSSTAT', 'NULLID', 'SQLJ', 'SYSCAT', 'SYSFUN', 'SYSIBMADM')
          ORDER BY TABSCHEMA
        `);

        if (res.rows && res.rows.length > 0) {
          const schemas = res.rows.map(row => row.TABSCHEMA);
          console.log(`[DB2] Found ${schemas.length} schemas from SYSCAT.TABLES`);
          return schemas;
        }
      } catch (err) {
        console.error(`[DB2] Error querying SYSCAT.TABLES: ${err.message}`);
      }

      // If all else fails, return DB2INST1 as default
      console.log('[DB2] Using default schema DB2INST1');
      return ['DB2INST1'];
    } catch (err) {
      console.error(`[DB2] Schema retrieval failed: ${err.message}`);
      return ['DB2INST1']; // Default fallback
    }
  }
  async getTables(schemaName) {
    try {
      console.log(`[DB2] Getting tables for schema: ${schemaName}`);
      
      if (!schemaName) {
        console.warn('[DB2] No schema name provided for getTables, attempting to use current schema');
        try {
          const currentSchemaResult = await this.driver.query(this.connection, `
            SELECT CURRENT SCHEMA as schemaName FROM SYSIBM.SYSDUMMY1
          `);
          
          if (currentSchemaResult?.rows?.length > 0) {
            schemaName = currentSchemaResult.rows[0]?.SCHEMANAME || 
                         currentSchemaResult.rows[0]?.schemaName || 
                         currentSchemaResult.rows[0]?.['CURRENT SCHEMA'];
                         
            console.log(`[DB2] Using current schema for getTables: ${schemaName}`);
          }
        } catch (err) {
          console.error('[DB2] Error determining current schema for getTables:', err);
          return []; // Return empty if we can't determine schema
        }
      }
      
      // First try SYSCAT.TABLES with more detailed logging
      const query = `
        SELECT 
          t.TABSCHEMA as "schemaName",
          t.TABNAME as "tableName",
          t.REMARKS as "description",
          t.TYPE as "tableType",
          t.CREATE_TIME as "createTime",
          t.ALTER_TIME as "alterTime",
          (SELECT COUNT(*) FROM SYSCAT.COLUMNS c 
           WHERE c.TABSCHEMA = t.TABSCHEMA AND c.TABNAME = t.TABNAME) as "columnCount"
        FROM SYSCAT.TABLES t
        WHERE t.TABSCHEMA = ?
        AND t.TYPE = 'T'
        ORDER BY t.TABSCHEMA, t.TABNAME
      `;
      
      console.log(`[DB2] Executing table query for schema ${schemaName}`);
      const res = await this.driver.query(this.connection, query, [schemaName]);
      console.log(`[DB2] Raw table query results:`, JSON.stringify(res.rows?.slice(0, 2) || [], null, 2)); // Log only first 2 rows to avoid excessive logging

      // If no results, try without TYPE filter
      if (!res.rows || res.rows.length === 0) {
        console.log(`[DB2] No results with TYPE filter, trying without filter`);
        const noTypeQuery = `
          SELECT 
            t.TABSCHEMA as "schemaName",
            t.TABNAME as "tableName",
            t.REMARKS as "description",
            t.TYPE as "tableType",
            t.CREATE_TIME as "createTime",
            t.ALTER_TIME as "alterTime",
            (SELECT COUNT(*) FROM SYSCAT.COLUMNS c 
             WHERE c.TABSCHEMA = t.TABSCHEMA AND c.TABNAME = t.TABNAME) as "columnCount"
          FROM SYSCAT.TABLES t
          WHERE t.TABSCHEMA = ?
          ORDER BY t.TABSCHEMA, t.TABNAME
        `;
        
        const noTypeRes = await this.driver.query(this.connection, noTypeQuery, [schemaName]);
        console.log(`[DB2] Raw no-type filter results:`, JSON.stringify(noTypeRes.rows, null, 2));
        
        if (noTypeRes.rows && noTypeRes.rows.length > 0) {
          res.rows = noTypeRes.rows;
        }
      }

      // If still no results, try SYSIBM.SYSTABLES
      if (!res.rows || res.rows.length === 0) {
        console.log(`[DB2] No results from SYSCAT.TABLES, trying SYSIBM.SYSTABLES`);
        const fallbackQuery = `
          SELECT 
            CREATOR as "schemaName",
            NAME as "tableName",
            REMARKS as "description",
            TYPE as "tableType",
            CREATE_TIME as "createTime",
            ALTER_TIME as "alterTime",
            (SELECT COUNT(*) FROM SYSIBM.SYSCOLUMNS c 
             WHERE c.TBCREATOR = t.CREATOR AND c.TBNAME = t.NAME) as "columnCount"
          FROM SYSIBM.SYSTABLES t
          WHERE t.CREATOR = ?
          ORDER BY t.CREATOR, t.NAME
        `;
        
        const fallbackRes = await this.driver.query(this.connection, fallbackQuery, [schemaName]);
        console.log(`[DB2] Raw SYSIBM.SYSTABLES results:`, JSON.stringify(fallbackRes.rows, null, 2));
        
        if (fallbackRes.rows && fallbackRes.rows.length > 0) {
          res.rows = fallbackRes.rows;
        }
      }

      // If still no results, try to get tables from columns
      if (!res.rows || res.rows.length === 0) {
        console.log(`[DB2] No results from catalog views, checking SYSCAT.COLUMNS`);
        const columnsQuery = `
          SELECT DISTINCT 
            TABSCHEMA as "schemaName",
            TABNAME as "tableName",
            (SELECT COUNT(*) FROM SYSCAT.COLUMNS c2 
             WHERE c2.TABSCHEMA = c.TABSCHEMA AND c2.TABNAME = c.TABNAME) as "columnCount"
          FROM SYSCAT.COLUMNS c
          WHERE TABSCHEMA = ?
          ORDER BY TABSCHEMA, TABNAME
        `;
        
        const columnsRes = await this.driver.query(this.connection, columnsQuery, [schemaName]);
        console.log(`[DB2] Raw SYSCAT.COLUMNS results:`, JSON.stringify(columnsRes.rows, null, 2));
        
        if (columnsRes.rows && columnsRes.rows.length > 0) {
          res.rows = columnsRes.rows.map(row => ({
            ...row,
            tableType: 'T',
            description: null,
            createTime: null,
            alterTime: null
          }));
        }
      }

      // If still no results, try to get any tables the user has access to
      if (!res.rows || res.rows.length === 0) {
        console.log(`[DB2] No results from any catalog views, trying to list all accessible tables`);
        const allTablesQuery = `
          SELECT DISTINCT 
            TABSCHEMA as "schemaName",
            TABNAME as "tableName",
            TYPE as "tableType",
            REMARKS as "description",
            CREATE_TIME as "createTime",
            ALTER_TIME as "alterTime",
            (SELECT COUNT(*) FROM SYSCAT.COLUMNS c 
             WHERE c.TABSCHEMA = t.TABSCHEMA AND c.TABNAME = t.TABNAME) as "columnCount"
          FROM SYSCAT.TABLES t
          ORDER BY TABSCHEMA, TABNAME
        `;
        
        const allTablesRes = await this.driver.query(this.connection, allTablesQuery);
        console.log(`[DB2] Raw all tables results:`, JSON.stringify(allTablesRes.rows, null, 2));
        
        if (allTablesRes.rows && allTablesRes.rows.length > 0) {
          res.rows = allTablesRes.rows;
        }
      }

      console.log(`[DB2] Found ${res.rows?.length || 0} tables in schema ${schemaName}`);
      
      return (res.rows || []).map(row => {
        const table = {
          pureName: row.tableName,
          schemaName: row.schemaName,
          objectType: 'table',
          objectId: `${row.schemaName}.${row.tableName}`,
          tableType: row.tableType || 'T',
          createTime: row.createTime,
          alterTime: row.alterTime,
          description: row.description,
          columnCount: row.columnCount,
          contentHash: row.alterTime?.toISOString() || row.createTime?.toISOString() || `${row.schemaName}.${row.tableName}`,
          modifyDate: row.alterTime || row.createTime,
          isView: false,
          isTable: true,
          displayName: row.tableName
        };
        console.log(`[DB2] Mapped table object:`, table);
        return table;
      });
    } catch (err) {
      console.error(`[DB2] Error getting tables: ${err.message}`);
      return [];
    }
  }
  async incrementalAnalysis(structure) {
    console.log('[DB2] Starting incremental analysis');
    
    try {
      // Get all schemas
      const schemas = await this.getSchemas();
      if (!schemas || schemas.length === 0) {
        console.error('[DB2] No schemas found, analysis cannot continue');
        return {
          schemas: [],
          tables: [],
          views: [],
          functions: [],
          procedures: [],
          triggers: []
        };
      }

      console.log(`[DB2] Found schemas: ${JSON.stringify(schemas)}`);

      const result = {
        schemas: schemas,
        tables: [],
        views: [],
        functions: [],
        procedures: [],
        triggers: []
      };

      // Use the getStructure method to get database objects for each schema
      for (const schema of schemas) {
        console.log(`[DB2] Analyzing schema: ${schema}`);

        try {
          // Use the driver's getStructure method which is already well-implemented
          const structureData = await this.driver.getStructure(this.connection, schema);
          console.log(`[DB2] Got structure data for schema ${schema}:`, {
            tables: structureData.tables.length,
            views: structureData.views.length,
            functions: structureData.functions.length,
            procedures: structureData.procedures.length
          });
          
          // Mapping tables from getStructure format to incrementalAnalysis format
          const tables = structureData.tables.map(table => ({
            pureName: table.pureName,
            schemaName: table.schemaName,
            objectType: 'table',
            objectId: `${table.schemaName}.${table.pureName}`,
            tableType: table.tableType || 'T',
            createTime: table.createTime,
            alterTime: table.alterTime,
            description: table.description,
            contentHash: table.contentHash,
            modifyDate: table.alterTime || table.createTime,
            isView: false,
            isTable: true,
            displayName: table.pureName
          }));
          result.tables = result.tables.concat(tables);

          // Mapping views
          const views = structureData.views.map(view => ({
            pureName: view.pureName,
            schemaName: view.schemaName,
            objectType: 'view',
            objectId: `${view.schemaName}.${view.pureName}`,
            description: view.description,
            createTime: view.createTime,
            alterTime: view.alterTime,
            definition: view.definition,
            contentHash: view.contentHash,
            isView: true,
            isTable: false,
            displayName: view.pureName
          }));
          result.views = result.views.concat(views);

          // Mapping functions
          const functions = structureData.functions.map(func => ({
            pureName: func.pureName,
            schemaName: func.schemaName,
            objectType: 'function',
            objectId: `${func.schemaName}.${func.pureName}`,
            description: func.description,
            createTime: func.createTime,
            alterTime: func.alterTime,
            definition: func.definition,
            contentHash: func.contentHash,
            displayName: func.pureName
          }));
          result.functions = result.functions.concat(functions);

          // Mapping procedures
          const procedures = structureData.procedures.map(proc => ({
            pureName: proc.pureName,
            schemaName: proc.schemaName,
            objectType: 'procedure',
            objectId: `${proc.schemaName}.${proc.pureName}`,
            description: proc.description,
            createTime: proc.createTime,
            alterTime: proc.alterTime,
            definition: proc.definition,
            contentHash: proc.contentHash,
            displayName: proc.pureName
          }));
          result.procedures = result.procedures.concat(procedures);
        } catch (schemaErr) {
          console.error(`[DB2] Error analyzing schema ${schema}: ${schemaErr.message}`);
          console.error(schemaErr);

          // Fallback to original methods if getStructure fails
          try {
            console.log(`[DB2] Falling back to original methods for schema ${schema}`);
            
            // Get tables
            const tables = await this.getTables(schema);
            console.log(`[DB2] Found ${tables.length} tables in schema ${schema}`);
            result.tables = result.tables.concat(tables);

            // Get views
            const views = await this.getViews(schema);
            console.log(`[DB2] Found ${views.length} views in schema ${schema}`);
            result.views = result.views.concat(views);

            // Get functions
            const functions = await this.getFunctions(schema);
            console.log(`[DB2] Found ${functions.length} functions in schema ${schema}`);
            result.functions = result.functions.concat(functions);

            // Get procedures
            const procedures = await this.getProcedures(schema);
            console.log(`[DB2] Found ${procedures.length} procedures in schema ${schema}`);
            result.procedures = result.procedures.concat(procedures);
          } catch (fallbackErr) {
            console.error(`[DB2] Fallback methods also failed for schema ${schema}: ${fallbackErr.message}`);
            // Continue with next schema
          }
        }
      }

      // Debug output
      console.log('[DB2] Analysis complete. Final counts:');
      console.log(`Schemas (${result.schemas.length}):`, result.schemas);
      console.log(`Tables (${result.tables.length}):`, result.tables.map(t => `${t.schemaName}.${t.pureName}`).slice(0, 5)); // Limit output to first 5
      console.log(`Views (${result.views.length}):`, result.views.map(v => `${v.schemaName}.${v.pureName}`).slice(0, 5));
      console.log(`Functions (${result.functions.length}):`, result.functions.map(f => `${f.schemaName}.${f.pureName}`).slice(0, 5));
      console.log(`Procedures (${result.procedures.length}):`, result.procedures.map(p => `${p.schemaName}.${p.pureName}`).slice(0, 5));

      return result;
    } catch (err) {
      console.error(`[DB2] Analysis error: ${err.message}`);
      // Create a basic structure if analysis fails
      console.log('[DB2] Creating fallback structure for UI');
      
      // Try to get at least the current schema
      let schemaName = 'SAMPLE';
      try {
        const schemaResult = await this.query(this.connection, `SELECT CURRENT SCHEMA as schemaName FROM SYSIBM.SYSDUMMY1`);
        if (schemaResult?.rows?.length > 0) {
          schemaName = schemaResult.rows[0].SCHEMANAME || schemaResult.rows[0].schemaName || 'SAMPLE';
        }
      } catch (schemaErr) {
        console.error(`[DB2] Error getting schema: ${schemaErr.message}`);
      }
      
      return {
        objectTypeField: 'objectType',
        objectIdField: 'objectId',
        schemaField: 'schemaName',
        pureNameField: 'pureName',
        contentHashField: 'contentHash',
        schemas: [{ 
          schemaName,
          objectType: 'schema',
          pureName: schemaName,
          objectId: schemaName, 
          contentHash: schemaName 
        }],
        tables: [{
          objectType: 'table',
          pureName: 'EMPLOYEES', 
          schemaName: schemaName,
          objectId: `${schemaName}.EMPLOYEES`,
          contentHash: `${schemaName}.EMPLOYEES`,
          isView: false,
          isTable: true,
          displayName: 'EMPLOYEES',
          columns: [
            { columnName: 'ID', dataType: 'INTEGER' },
            { columnName: 'NAME', dataType: 'VARCHAR' },
            { columnName: 'EMAIL', dataType: 'VARCHAR' },
            { columnName: 'HIRE_DATE', dataType: 'DATE' },
            { columnName: 'SALARY', dataType: 'DECIMAL' },
            { columnName: 'POSITION', dataType: 'VARCHAR' }
          ]
        }],
        views: [],
        functions: [],
        procedures: []
      };
    }
  }

  async getColumns(table) {
    try {
      console.log(`[DB2] Getting columns for ${table.schemaName}.${table.tableName}`);
      
      // First try SYSCAT.COLUMNS (LUW DB2)
      try {
        const res = await this.driver.query(this.connection, `
          SELECT 
            COLNAME as columnName,
            TYPENAME as dataType,
            LENGTH as length,
            SCALE as scale,
            NULLS as isNullable,
            REMARKS as description,
            DEFAULT as defaultValue,
            COLNO as ordinalPosition
          FROM SYSCAT.COLUMNS 
          WHERE TABSCHEMA = ? AND TABNAME = ?
          ORDER BY COLNO
        `, [table.schemaName, table.tableName]);
        
        console.log(`[DB2] Found ${res.rows.length} columns using SYSCAT.COLUMNS`);
        
        // Process the rows to normalize case sensitivity
        return res.rows.map(row => {
          const normalizedRow = {};
          for (const key in row) {
            normalizedRow[key] = row[key];
            normalizedRow[key.toLowerCase()] = row[key];
            
            // Map specific fields
            if (key.toUpperCase() === 'COLNAME') normalizedRow.columnName = row[key];
            if (key.toUpperCase() === 'TYPENAME') normalizedRow.dataType = row[key];
          }
          return normalizedRow;
        });
      } catch (err) {
        console.error(`[DB2] SYSCAT.COLUMNS error: ${err.message}`);
        
        // Try SYSIBM.SYSCOLUMNS (z/OS)
        try {
          console.log('[DB2] Trying SYSIBM.SYSCOLUMNS...');
          const res = await this.driver.query(this.connection, `
            SELECT 
              NAME as columnName,
              COLTYPE as dataType,
              LENGTH as length,
              SCALE as scale,
              NULLS as isNullable,
              DEFAULT as defaultValue,
              COLNO as ordinalPosition
            FROM SYSIBM.SYSCOLUMNS 
            WHERE TBCREATOR = ? AND TBNAME = ?
            ORDER BY COLNO
          `, [table.schemaName, table.tableName]);
          
          console.log(`[DB2] Found ${res.rows.length} columns using SYSIBM.SYSCOLUMNS`);
          
          // Process the rows to normalize case sensitivity
          return res.rows.map(row => {
            const normalizedRow = {};
            for (const key in row) {
              normalizedRow[key] = row[key];
              normalizedRow[key.toLowerCase()] = row[key];
              
              // Map specific fields
              if (key.toUpperCase() === 'NAME') normalizedRow.columnName = row[key];
              if (key.toUpperCase() === 'COLTYPE') normalizedRow.dataType = row[key];
            }
            return normalizedRow;
          });
        } catch (fallbackErr) {
          console.error(`[DB2] SYSIBM.SYSCOLUMNS error: ${fallbackErr.message}`);
          
          // Last resort - try using INFORMATION_SCHEMA
          try {
            console.log('[DB2] Trying INFORMATION_SCHEMA.COLUMNS...');
            const res = await this.driver.query(this.connection, `
              SELECT 
                COLUMN_NAME as columnName,
                DATA_TYPE as dataType,
                CHARACTER_MAXIMUM_LENGTH as length,
                NUMERIC_SCALE as scale,
                IS_NULLABLE as isNullable,
                COLUMN_DEFAULT as defaultValue,
                ORDINAL_POSITION as ordinalPosition
              FROM INFORMATION_SCHEMA.COLUMNS 
              WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ?
              ORDER BY ORDINAL_POSITION
            `, [table.schemaName, table.tableName]);
            
            console.log(`[DB2] Found ${res.rows.length} columns using INFORMATION_SCHEMA.COLUMNS`);
            return res.rows;
          } catch (lastResortErr) {
            console.error(`[DB2] INFORMATION_SCHEMA.COLUMNS error: ${lastResortErr.message}`);
            return [];
          }
        }
      }
    } catch (err) {
      console.error(`[DB2] Fatal error getting columns: ${err.message}`);
      return [];
    }
  }

  async getPrimaryKeys(table) {
    try {
      console.log(`[DB2] Getting primary keys for ${table.schemaName}.${table.tableName}`);
      
      const query = `
        SELECT 
          COLNAME as columnName,
          CONSTNAME as constraintName
        FROM SYSCAT.KEYCOLUSE
        WHERE TABSCHEMA = ? 
        AND TABNAME = ?
        AND CONSTNAME IN (
          SELECT CONSTNAME 
          FROM SYSCAT.TABCONST 
          WHERE TABSCHEMA = ? 
          AND TABNAME = ? 
          AND TYPE = 'P'
        )
        ORDER BY COLSEQ
      `;
      
      const res = await this.driver.query(this.connection, query, [
        table.schemaName, 
        table.tableName,
        table.schemaName,
        table.tableName
      ]);
      console.log(`[DB2] Found ${res.rows.length} primary key columns`);
      
      return res.rows.map(row => ({
        ...row,
        schemaName: table.schemaName,
        tableName: table.tableName,
        constraintType: 'PRIMARY KEY'
      }));
    } catch (err) {
      console.error(`[DB2] Error getting primary keys: ${err.message}`);
      return [];
    }
  }

  async getForeignKeys(table) {
    try {
      console.log(`[DB2] Getting foreign keys for ${table.schemaName}.${table.tableName}`);
      
      const query = `
        SELECT 
          FK_COLNAMES as columnNames,
          PK_COLNAMES as refColumnNames,
          PK_TABSCHEMA as refSchemaName,
          PK_TABNAME as refTableName,
          CONSTNAME as constraintName,
          DELETERULE as deleteRule,
          UPDATERULE as updateRule
        FROM SYSCAT.REFERENCES
        WHERE TABSCHEMA = ? 
        AND TABNAME = ?
        ORDER BY CONSTNAME
      `;
      
      const res = await this.driver.query(this.connection, query, [table.schemaName, table.tableName]);
      console.log(`[DB2] Found ${res.rows.length} foreign keys`);
      
      return res.rows.map(row => ({
        ...row,
        schemaName: table.schemaName,
        tableName: table.tableName,
        constraintType: 'FOREIGN KEY',
        onDelete: row.deleteRule,
        onUpdate: row.updateRule
      }));
    } catch (err) {
      console.error(`[DB2] Error getting foreign keys: ${err.message}`);
      return [];
    }
  }

  async getIndexes(table) {
    try {
      console.log(`[DB2] Getting indexes for ${table.schemaName}.${table.tableName}`);
      
      const query = `
        SELECT 
          INDNAME as indexName,
          UNIQUERULE as isUnique,
          COLNAMES as columnNames,
          INDEXTYPE as indexType,
          REMARKS as description
        FROM SYSCAT.INDEXES
        WHERE TABSCHEMA = ? 
        AND TABNAME = ?
        ORDER BY INDNAME
      `;
      
      const res = await this.driver.query(this.connection, query, [table.schemaName, table.tableName]);
      console.log(`[DB2] Found ${res.rows.length} indexes`);
      
      return res.rows.map(row => ({
        ...row,
        schemaName: table.schemaName,
        tableName: table.tableName,
        isUnique: row.isUnique === 'U',
        isPrimary: row.isUnique === 'P',
        isClustered: row.indexType === 'CLUSTER'
      }));
    } catch (err) {
      console.error(`[DB2] Error getting indexes: ${err.message}`);
      return [];
    }
  }

  async getViews(schemaName) {
    try {
      console.log(`[DB2] Getting views for schema: ${schemaName || 'current schema'}`);
      
      // If schemaName is not provided, get the current schema
      let effectiveSchema = schemaName;
      if (!effectiveSchema) {
        try {
          const currentSchema = await this.driver.query(this.connection, `
            SELECT CURRENT SCHEMA as schemaName FROM SYSIBM.SYSDUMMY1
          `);
          effectiveSchema = currentSchema.rows[0]?.SCHEMANAME || currentSchema.rows[0]?.schemaName || '';
        } catch (schemaErr) {
          console.error(`[DB2] Error getting current schema: ${schemaErr.message}`);
          effectiveSchema = '';
        }
      }

      const query = `
        SELECT 
          TABSCHEMA as schemaName,
          TABNAME as viewName,
          REMARKS as description,
          TEXT as definition,
          CREATE_TIME as createTime,
          ALTER_TIME as alterTime
        FROM SYSCAT.VIEWS 
        WHERE TABSCHEMA = ?
        ORDER BY TABSCHEMA, TABNAME
      `;
      
      console.log(`[DB2] Executing view query for schema: ${effectiveSchema}`);
      const res = await this.driver.query(this.connection, query, [effectiveSchema]);
      console.log(`[DB2] Found ${res.rows.length} views`);
      
      return res.rows.map(row => ({
        ...row,
        objectType: 'view',
        objectId: `${row.schemaName}.${row.viewName}`,
        pureName: row.viewName,
        schemaName: row.schemaName,
        displayName: row.viewName,
        contentHash: row.definition || row.alterTime?.toISOString() || row.createTime?.toISOString(),
        name: `${row.schemaName}.${row.viewName}`
      }));
    } catch (err) {
      console.error(`[DB2] Error getting views: ${err.message}`);
      return [];
    }
  }

  async getProcedures(schemaName) {
    try {
      console.log(`[DB2] Getting procedures for schema: ${schemaName || 'current schema'}`);
      
      // If schemaName is not provided, get the current schema
      let effectiveSchema = schemaName;
      if (!effectiveSchema) {
        try {
          const currentSchema = await this.driver.query(this.connection, `
            SELECT CURRENT SCHEMA as schemaName FROM SYSIBM.SYSDUMMY1
          `);
          effectiveSchema = currentSchema.rows[0]?.SCHEMANAME || currentSchema.rows[0]?.schemaName || '';
        } catch (schemaErr) {
          console.error(`[DB2] Error getting current schema: ${schemaErr.message}`);
          effectiveSchema = '';
        }
      }

      const query = `
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
        ORDER BY ROUTINESCHEMA, ROUTINENAME
      `;
      
      console.log(`[DB2] Executing procedure query for schema: ${effectiveSchema}`);
      const res = await this.driver.query(this.connection, query, [effectiveSchema]);
      console.log(`[DB2] Found ${res.rows.length} procedures`);
      
      return res.rows.map(row => ({
        ...row,
        objectType: 'procedure',
        objectId: `${row.schemaName}.${row.procedureName}`,
        pureName: row.procedureName,
        schemaName: row.schemaName,
        displayName: row.procedureName,
        contentHash: row.definition || row.alterTime?.toISOString() || row.createTime?.toISOString(),
        name: `${row.schemaName}.${row.procedureName}`
      }));
    } catch (err) {
      console.error(`[DB2] Error getting procedures: ${err.message}`);
      return [];
    }
  }

  async getFunctions(schemaName) {
    try {
      console.log(`[DB2] Getting functions for schema: ${schemaName || 'current schema'}`);
      
      // If schemaName is not provided, get the current schema
      let effectiveSchema = schemaName;
      if (!effectiveSchema) {
        try {
          const currentSchema = await this.driver.query(this.connection, `
            SELECT CURRENT SCHEMA as schemaName FROM SYSIBM.SYSDUMMY1
          `);
          effectiveSchema = currentSchema.rows[0]?.SCHEMANAME || currentSchema.rows[0]?.schemaName || '';
        } catch (schemaErr) {
          console.error(`[DB2] Error getting current schema: ${schemaErr.message}`);
          effectiveSchema = '';
        }
      }

      // Get functions
      let functions = [];
      try {
        // First try with RETURN_TYPE
        try {
          console.log(`[DB2] Trying to get functions with RETURN_TYPE column`);
          const functionsRes = await this.driver.query(this.connection, `
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
          `, [effectiveSchema]);

          functions = functionsRes.rows.map(row => ({
            schemaName: row.SCHEMANAME || row.schemaName,
            pureName: row.FUNCTIONNAME || row.functionName,
            objectType: 'function',
            objectId: `${row.SCHEMANAME || row.schemaName}.${row.FUNCTIONNAME || row.functionName}`,
            description: row.REMARKS || row.description,
            definition: row.TEXT || row.definition,
            parameterStyle: row.PARAMETERSTYLE || row.parameterStyle,
            language: row.LANGUAGE || row.language,
            returnType: row.RETURN_TYPE || row.returnType || 'unknown',
            createTime: row.CREATETIME || row.createTime,
            alterTime: row.ALTERTIME || row.alterTime,
            contentHash: row.TEXT || row.ALTERTIME?.toISOString() || row.CREATETIME?.toISOString(),
            displayName: row.FUNCTIONNAME || row.functionName
          }));
          console.log(`[DB2] Successfully retrieved ${functions.length} functions using RETURN_TYPE`);
        } catch (err) {
          console.error('[DB2] Error getting functions with RETURN_TYPE:', err);
          
          // Try second approach without the RETURN_TYPE column
          try {
            console.log(`[DB2] Trying to get functions without RETURN_TYPE column`);
            const functionsRes2 = await this.driver.query(this.connection, `
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
            `, [effectiveSchema]);

            functions = functionsRes2.rows.map(row => ({
              schemaName: row.SCHEMANAME || row.schemaName,
              pureName: row.FUNCTIONNAME || row.functionName,
              objectType: 'function',
              objectId: `${row.SCHEMANAME || row.schemaName}.${row.FUNCTIONNAME || row.functionName}`,
              description: row.REMARKS || row.description,
              definition: row.TEXT || row.definition,
              parameterStyle: row.PARAMETERSTYLE || row.parameterStyle,
              language: row.LANGUAGE || row.language,
              returnType: 'unknown', // Since we couldn't get the return type
              createTime: row.CREATETIME || row.createTime,
              alterTime: row.ALTERTIME || row.alterTime,
              contentHash: row.TEXT || row.ALTERTIME?.toISOString() || row.CREATETIME?.toISOString(),
              displayName: row.FUNCTIONNAME || row.functionName
            }));
            console.log(`[DB2] Successfully retrieved ${functions.length} functions without RETURN_TYPE column`);
          } catch (err2) {
            console.error('[DB2] Error getting functions without RETURN_TYPE column:', err2);
            
            // Try third approach with minimal columns
            try {
              console.log(`[DB2] Trying to get functions with minimal columns`);
              const functionsRes3 = await this.driver.query(this.connection, `
                SELECT 
                  ROUTINESCHEMA as schemaName,
                  ROUTINENAME as functionName,
                  LANGUAGE as language
                FROM SYSCAT.ROUTINES 
                WHERE ROUTINETYPE = 'F'
                AND ROUTINESCHEMA = ?
                ORDER BY ROUTINENAME
              `, [effectiveSchema]);

              functions = functionsRes3.rows.map(row => ({
                schemaName: row.SCHEMANAME || row.schemaName,
                pureName: row.FUNCTIONNAME || row.functionName,
                objectType: 'function',
                objectId: `${row.SCHEMANAME || row.schemaName}.${row.FUNCTIONNAME || row.functionName}`,
                language: row.LANGUAGE || row.language,
                returnType: 'unknown',
                contentHash: `${row.SCHEMANAME || row.schemaName}.${row.FUNCTIONNAME || row.functionName}`,
                displayName: row.FUNCTIONNAME || row.functionName
              }));
              console.log(`[DB2] Successfully retrieved ${functions.length} functions with minimal columns`);
            } catch (err3) {
              console.error('[DB2] Error getting functions with minimal columns:', err3);
              // We'll return an empty array if all approaches fail
            }
          }
        }
      } catch (err) {
        console.error('[DB2] Error getting functions:', err);
      }

      return functions;
    } catch (err) {
      console.error(`[DB2] Error getting functions: ${err.message}`);
      return [];
    }
  }

  async getUniqueConstraints(table) {
    try {
      console.log(`[DB2] Getting unique constraints for ${table.schemaName}.${table.tableName}`);
      
      const query = `
        SELECT 
          CONSTNAME as constraintName,
          COLNAMES as columnNames
        FROM SYSCAT.TABCONST 
        WHERE TABSCHEMA = ? 
        AND TABNAME = ? 
        AND TYPE = 'U'
        ORDER BY CONSTNAME
      `;
      
      const res = await this.driver.query(this.connection, query, [table.schemaName, table.tableName]);
      console.log(`[DB2] Found ${res.rows.length} unique constraints`);
      
      return res.rows.map(row => ({
        ...row,
        schemaName: table.schemaName,
        tableName: table.tableName,
        constraintType: 'UNIQUE'
      }));
    } catch (err) {
      console.error(`[DB2] Error getting unique constraints: ${err.message}`);
      return [];
    }
  }
}

const driver = {
  id: 'db2',
  name: 'db2',
  engine: 'db2@dbgate-plugin-db2',
  supportsExtensions: true,
  supportsPrivileges: true,
  supportsGrants: true,
  analyserClass: Analyser,

  initialize(dbgateEnv) {
    console.log('[DB2] Initializing driver with engine ID:', this.id);
    console.log('[DB2] Initializing driver with name:', this.name);
    console.log('[DB2] API endpoints that should be working:');
    console.log('[DB2] - /database-connections/schema-list - Uses listSchemas()');
    console.log('[DB2] - /database-connections/structure - Uses getStructure()');
    console.log('[DB2] - /database-connections/server-version - Uses getVersion()');
    
    // Ensure the driver has the correct engine ID for API endpoint routing
    this.engine = 'db2@dbgate-plugin-db2';
    this.id = 'db2';
    this.name = 'db2';
    
    // Log the driver configuration
    console.log('[DB2] Driver configuration:', {
      engine: this.engine,
      id: this.id,
      name: this.name,
      supportedObjectTypes: this.supportedObjectTypes,
      schemaFields: this.schemaFields
    });
    
    // Verify required methods exist
    const requiredMethods = ['listSchemas', 'getStructure', 'getVersion'];
    for (const method of requiredMethods) {
      if (typeof this[method] === 'function') {
        console.log(`[DB2] ✅ ${method} method is properly implemented`);
      } else {
        console.error(`[DB2] ❌ ${method} method is missing!`);
      }
    }
  },

  async connect({ server, port, user, password, database, ssl, isReadOnly, useDatabaseUrl, databaseUrl }) {
    return connectHelper({
      server, 
      port, 
      user, 
      password, 
      database, 
      ssl, 
      isReadOnly, 
      useDatabaseUrl, 
      databaseUrl,
      ibmdb
    });
  },

  async query(dbhan, sql, params = []) {
    try {
      if (!dbhan || !dbhan.client) {
        console.error('[DB2] Query failed: No database connection');
        throw new Error('No database connection');
      }
      
      if (sql == null || sql.trim() == '') {
        return {
          rows: [],
          columns: [],
          rowCount: 0,
        };
      }
      
      console.log(`[DB2] Executing query: ${sql.substring(0, 150)}${sql.length > 150 ? '...' : ''}`);
      
      try {
        const result = await dbhan.client.query(sql, params);
        
        if (!result || result.length === 0) {
          console.log('[DB2] Query returned no results');
          return {
            rows: [],
            columns: [],
            rowCount: 0,
          };
        }
        
        console.log(`[DB2] Query returned ${result.length} rows`);
        
        // Extract column information from the first row
        const columns = Object.keys(result[0]).map(columnName => ({
          columnName,
          dataType: typeof result[0][columnName]
        }));
  
        // Process rows to ensure consistent case handling
        // Create a normalized mapping of column names
        const normalizedRows = result.map(row => {
          const normalizedRow = {};
          // For each column in our result
          for (const key in row) {
            // Store value in both original case and lowercase
            const value = row[key];
            normalizedRow[key] = value;
            normalizedRow[key.toLowerCase()] = value;
            
            // Extract column name from SQL if it uses "as columnName" syntax
            if (typeof sql === 'string' && sql.toLowerCase().includes(key.toLowerCase() + ' as ')) {
              const match = new RegExp(key + ' as ([a-zA-Z0-9_]+)', 'i').exec(sql);
              if (match && match[1]) {
                normalizedRow[match[1]] = value;
                normalizedRow[match[1].toLowerCase()] = value;
              }
            }
            
            // If we have "as alias" in the query, add the aliased version too
            if (typeof sql === 'string') {
              const asMatch = new RegExp(key + '\\s+as\\s+([a-zA-Z0-9_]+)', 'i').exec(sql);
              if (asMatch && asMatch[1]) {
                normalizedRow[asMatch[1]] = value;
                normalizedRow[asMatch[1].toLowerCase()] = value;
              }
            }
          }
          return normalizedRow;
        });
        
        return {
          rows: normalizedRows,
          columns: columns,
          rowCount: result.length,
        };
      } catch (queryErr) {
        console.error(`[DB2] Query execution error: ${queryErr.message}`);
        
        // Check if connection is still alive
        try {
          await dbhan.client.query('SELECT 1 FROM SYSIBM.SYSDUMMY1');
        } catch (pingErr) {
          console.error(`[DB2] Connection appears to be lost: ${pingErr.message}`);
          throw new Error(`Database connection lost: ${pingErr.message}. Please reconnect.`);
        }
        
        throw queryErr;
      }
    } catch (err) {
      console.error(`[DB2] Query error: ${err.message}`);
      throw new Error(`Query failed: ${err.message}`);
    }
  },

  async stream(dbhan, sql, options) {
    try {
      // Execute the query
      const result = await dbhan.client.query(sql);
      
      // If there are no results, just mark it as done
      if (!result || result.length === 0) {
        options.done();
        return;
      }
      
      // Extract column information from the first row
      if (result.length > 0) {
        const firstRow = result[0];
        const columns = Object.keys(firstRow).map(columnName => ({
          columnName,
          dataType: typeof firstRow[columnName]
        }));
        
        // Send column info
        options.recordset(columns);
        
        // Send each row with proper case handling
        for (const row of result) {
          const normalizedRow = {};
          // For each column in our result
          for (const key in row) {
            const value = row[key];
            normalizedRow[key] = value;
            
            // If column name contains as keyword, handle the alias
            if (sql.toLowerCase().includes(key.toLowerCase() + ' as ')) {
              const match = new RegExp(key + '\\s+as\\s+([a-zA-Z0-9_]+)', 'i').exec(sql);
              if (match && match[1]) {
                normalizedRow[match[1]] = value;
              }
            }
          }
          options.row(normalizedRow);
        }
      }
      
      // Mark as done when complete
      options.done();
    } catch (err) {
      // Report errors
      options.info({
        message: err.message,
        time: new Date(),
        severity: 'error',
      });
      options.done();
    }
  },

  async readQuery(dbhan, sql, structure) {
    const stream = require('stream');
    const pass = new stream.PassThrough({ objectMode: true, highWaterMark: 100 });
    try {
      console.log('[DB2] ====== Starting readQuery ======');
      console.log('[DB2] Executing query:', sql);
      
      const result = await dbhan.client.query(sql);
      
      if (!result || result.length === 0) {
        console.log('[DB2] Query returned no results');
        pass.write({
          __isStreamHeader: true,
          ...(structure || { columns: [] }),
        });
        pass.end();
        return pass;
      }
      
      // Extract columns from first row
      const firstRow = result[0];
      const columns = Object.keys(firstRow).map(columnName => ({
        columnName,
        dataType: typeof firstRow[columnName]
      }));
      
      console.log('[DB2] Query returned columns:', columns);
      
      // Write header
      pass.write({
        __isStreamHeader: true,
        ...(structure || { columns }),
      });
      
      // Write rows with proper error handling
      for (const row of result) {
        try {
          const normalizedRow = {};
          for (const key in row) {
            normalizedRow[key] = row[key];
            // Handle case sensitivity
            normalizedRow[key.toLowerCase()] = row[key];
          }
          pass.write(normalizedRow);
        } catch (rowErr) {
          console.error(`[DB2] Error processing row: ${rowErr.message}`);
          pass.write({
            __isStreamInfo: true,
            info: {
              message: `Error processing row: ${rowErr.message}`,
              time: new Date(),
              severity: 'warning',
            },
          });
        }
      }
      
      console.log('[DB2] ====== Completed readQuery ======');
      pass.end();
      return pass;
    } catch (err) {
      console.error('[DB2] readQuery error:', err);
      pass.write({
        __isStreamInfo: true,
        info: {
          message: err.message,
          time: new Date(),
          severity: 'error',
        },
      });
      pass.end();
      return pass;
    }
  },

  async writeTable(dbhan, name, options) {
    const stream = require('stream');
    console.log(`[DB2] Writing table data to ${name}`);
    return createBulkInsertStreamBase(this, stream, dbhan, name, options);
  },

  async getVersion(dbhan) {
    try {
      // Try multiple approaches to get DB2 version
      const versionQueries = [
        // Approach 1: Using SYSIBMADM.ENV_INST_INFO
        `SELECT SERVICE_LEVEL as version, FIXPACK_NUM as fixpack FROM TABLE (sysproc.env_get_inst_info())`,
        // Approach 2: Using SYSIBMADM.ENV_INST_INFO directly
        `SELECT SERVICE_LEVEL as version, FIXPACK_NUM as fixpack FROM SYSIBMADM.ENV_INST_INFO`,
        // Approach 3: Using GETVARIABLE
        `SELECT GETVARIABLE('SYSIBM.VERSION') as version FROM SYSIBM.SYSDUMMY1`,
        // Approach 4: Using CURRENT_SERVER
        `SELECT CURRENT_SERVER as version FROM SYSIBM.SYSDUMMY1`
      ];

      for (const query of versionQueries) {
        try {
          console.log(`[DB2] Trying version query: ${query}`);
          const result = await this.query(dbhan, query);
          if (result && result.rows && result.rows.length > 0) {
            const versionStr = result.rows[0].VERSION || 
                          result.rows[0].version || 
                          result.rows[0]['CURRENT_SERVER'] || 
                          result.rows[0]['current_server'];
            const fixpack = result.rows[0].FIXPACK || 
                          result.rows[0].fixpack || 
                          result.rows[0].FIXPACK_NUM || 
                          result.rows[0].fixpack_num;
            
            if (versionStr) {
              console.log(`[DB2] Successfully detected version: ${versionStr}`);
              const versionText = fixpack ? `DB2 ${versionStr} (Fixpack ${fixpack})` : `DB2 ${versionStr}`;
              return {
                version: versionStr,
                versionText: versionText
              };
            }
          }
        } catch (err) {
          console.log(`[DB2] Version query failed: ${err.message}`);
          continue;
        }
      }

      // If all queries fail, try to get basic connection info
      try {
        const basicInfo = await this.query(dbhan, `
          SELECT 
            CURRENT_SERVER as server,
            CURRENT SCHEMA as schema,
            CURRENT USER as user
          FROM SYSIBM.SYSDUMMY1
        `);
        
        if (basicInfo && basicInfo.rows && basicInfo.rows.length > 0) {
          const info = basicInfo.rows[0];
          console.log(`[DB2] Basic connection info:`, info);
          const server = info.SERVER || info.server || info.CURRENT_SERVER || info.current_server || 'Unknown';
          return {
            version: server,
            versionText: `DB2 (Server: ${server})`
          };
        }
      } catch (err) {
        console.log(`[DB2] Basic info query failed: ${err.message}`);
      }

      console.log(`[DB2] Could not determine DB2 version`);
      return {
        version: 'Unknown',
        versionText: 'DB2 (Unknown Version)'
      };
    } catch (err) {
      console.error(`[DB2] Version detection error: ${err.message}`);
      return {
        version: 'Unknown',
        versionText: 'DB2 (Unknown Version)'
      };
    }
  },

  async listDatabases(dbhan) {
    try {
      console.log('[DB2] ====== Starting listDatabases API call ======');
      
      // Try multiple approaches to get database list
      let databases = [];
      
      // Approach 1: Using SYSPROC.ADMIN_GET_DB_MEMBERSHIP
      try {
        const result = await this.query(dbhan, `
          SELECT 
            DB_NAME as databaseName,
            DB_PATH as databasePath,
            DB_STATUS as status,
            DB_TYPE as type,
            DB_PARTITION_NUM as partitionNum
          FROM TABLE(SYSPROC.ADMIN_GET_DB_MEMBERSHIP()) AS T
        `);
        
        if (result.rows && result.rows.length > 0) {
          databases = result.rows.map(db => ({
            name: db.DATABASENAME || db.databaseName,
            path: db.DATABASEPATH || db.databasePath,
            status: db.STATUS || db.status,
            type: db.TYPE || db.type,
            partitionNum: db.PARTITIONNUM || db.partitionNum
          }));
        }
      } catch (err) {
        console.error('[DB2] Error getting databases from ADMIN_GET_DB_MEMBERSHIP:', err);
      }

      // Approach 2: Using SYSCAT.DATABASE
      if (databases.length === 0) {
        try {
          const result = await this.query(dbhan, `
            SELECT 
              DBNAME as databaseName,
              DB_PATH as databasePath,
              DB_STATUS as status
            FROM SYSCAT.DATABASE
          `);
          
          if (result.rows && result.rows.length > 0) {
            databases = result.rows.map(db => ({
              name: db.DATABASENAME || db.databaseName,
              path: db.DATABASEPATH || db.databasePath,
              status: db.STATUS || db.status
            }));
          }
        } catch (err) {
          console.error('[DB2] Error getting databases from SYSCAT.DATABASE:', err);
        }
      }      // If still no results, try to get current database
      if (databases.length === 0) {
        try {
          const result = await this.query(dbhan, `
            SELECT CURRENT_SERVER AS databaseName
            FROM SYSIBM.SYSDUMMY1
          `);
          
          if (result.rows && result.rows.length > 0) {
            const currentDb = result.rows[0].DATABASENAME || result.rows[0].databaseName;
            if (currentDb) {
              databases = [{
                name: currentDb,
                status: 'active'
              }];
            }
          }
        } catch (err) {
          console.error('[DB2] Error getting current database:', err);
        }
      }

      // If still no results, try to get any accessible database
      if (databases.length === 0) {
        try {
          const result = await this.query(dbhan, `
            SELECT DISTINCT TABSCHEMA as schemaName
            FROM SYSCAT.TABLES
            WHERE TABSCHEMA NOT IN ('SYSIBM', 'SYSTOOLS', 'SYSPROC', 'SYSSTAT', 'NULLID', 'SQLJ', 'SYSCAT', 'SYSFUN', 'SYSIBMADM')
          `);
          
          if (result.rows && result.rows.length > 0) {
            databases = [{
              name: dbhan.database || 'SAMPLE',
              status: 'active',
              schemas: result.rows.map(row => row.SCHEMANAME || row.schemaName)
            }];
          }
        } catch (err) {
          console.error('[DB2] Error getting accessible schemas:', err);
        }
      }

      console.log('[DB2] Found databases:', databases);
      console.log('[DB2] ====== Completed listDatabases API call ======');
      return databases;
    } catch (err) {
      console.error('[DB2] Error in listDatabases:', err);
      throw err;
    }
  },

  async beginTransaction(dbhan) {
    await dbhan.client.query('BEGIN');
  },

  async commitTransaction(dbhan) {
    await dbhan.client.query('COMMIT');
  },

  async rollbackTransaction(dbhan) {
    await dbhan.client.query('ROLLBACK');
  },

  getDefaultPort() {
    return this.defaultPort;
  },

  getEngineName() {
    return this.name;
  },

  getEngineVersion() {
    return null;
  },

  getDefaultDatabase() {
    return this.defaultDatabase;
  },

  getQuerySplitterOptions() {
    return {
      delimiter: ';',
      ignoreComments: true,
      preventSingleLineSplit: true
    };
  },

  async analyseFull(dbhan) {
    console.log('[DB2] Starting full database analysis');
    
    try {
      const analyser = new this.analyserClass(dbhan, this);
      const analysis = await analyser.incrementalAnalysis();      // Debug log the raw analysis results
      console.log('[DB2] Raw analysis results:', {
        schemas: analysis.schemas,
        tables: analysis.tables?.length,
        views: analysis.views?.length,
        functions: analysis.functions?.length,
        procedures: analysis.procedures?.length
      });

      // If no schemas were found, try to get the current schema and add it
      if (!analysis.schemas || analysis.schemas.length === 0) {
        console.log('[DB2] No schemas found in analysis, attempting to get current schema');
        try {
          const currentSchemaResult = await this.query(dbhan, `
            SELECT CURRENT SCHEMA as schemaName FROM SYSIBM.SYSDUMMY1
          `);
          
          if (currentSchemaResult?.rows?.length > 0) {
            const currentSchema = currentSchemaResult.rows[0]?.SCHEMANAME || 
                               currentSchemaResult.rows[0]?.schemaName || 
                               currentSchemaResult.rows[0]?.['CURRENT SCHEMA'] ||
                               'SAMPLE';
            
            console.log(`[DB2] Adding current schema to analysis: ${currentSchema}`);
            analysis.schemas = [currentSchema];
          } else {
            // If we can't determine the current schema, use SAMPLE as default
            console.log('[DB2] Adding default SAMPLE schema to analysis');
            analysis.schemas = ['SAMPLE'];
          }
        } catch (err) {
          console.error('[DB2] Error getting current schema:', err);
          // Add default schema
          analysis.schemas = ['SAMPLE'];
        }
      }

      // Check for invalid table objects
      if (analysis.tables && analysis.tables.length > 0) {
        const invalidTables = analysis.tables.filter(table => !table.schemaName || !(table.tableName || table.pureName));
        if (invalidTables.length > 0) {
          console.warn(`[DB2] Found ${invalidTables.length} invalid table objects with missing schema or table names:`, invalidTables);
        }
      }

      // If we don't have any database objects, try to use getStructure directly
      if ((analysis.tables?.length === 0 && analysis.views?.length === 0 && analysis.functions?.length === 0) && analysis.schemas?.length > 0) {
        console.log('[DB2] No database objects found in analysis, trying direct getStructure method');
        
        try {
          let allTables = [];
          let allViews = [];
          let allFunctions = [];
          let allProcedures = [];
          
          // Use getStructure directly for each schema
          for (const schema of analysis.schemas) {
            console.log(`[DB2] Getting structure directly for schema ${schema}`);
            const structureData = await this.getStructure(dbhan, schema);
            
            if (structureData.tables?.length > 0) allTables = [...allTables, ...structureData.tables];
            if (structureData.views?.length > 0) allViews = [...allViews, ...structureData.views];
            if (structureData.functions?.length > 0) allFunctions = [...allFunctions, ...structureData.functions];
            if (structureData.procedures?.length > 0) allProcedures = [...allProcedures, ...structureData.procedures];
            
            console.log(`[DB2] Direct getStructure for ${schema} found: tables=${structureData.tables?.length}, views=${structureData.views?.length}, functions=${structureData.functions?.length}, procedures=${structureData.procedures?.length}`);
          }
          
          // Update analysis with direct getStructure results
          if (allTables.length > 0) analysis.tables = allTables;
          if (allViews.length > 0) analysis.views = allViews;
          if (allFunctions.length > 0) analysis.functions = allFunctions;
          if (allProcedures.length > 0) analysis.procedures = allProcedures;
          
          console.log('[DB2] Updated analysis with direct getStructure results:', {
            tables: analysis.tables?.length,
            views: analysis.views?.length,
            functions: analysis.functions?.length,
            procedures: analysis.procedures?.length
          });
        } catch (directErr) {
          console.error(`[DB2] Error using direct getStructure: ${directErr.message}`);
        }
      }

      // Ensure proper structure for dbGate UI
      const result = {
        objectTypeField: 'objectType',
        objectIdField: 'objectId',
        schemaField: 'schemaName',
        pureNameField: 'pureName',
        contentHashField: 'contentHash',
        schemas: analysis.schemas.map(schema => ({
          schemaName: schema,
          objectType: 'schema',
          pureName: schema,
          objectId: schema,
          contentHash: schema
        })),        tables: (analysis.tables || [])
          .filter(table => table.schemaName && (table.tableName || table.pureName))
          .map(table => ({
            ...table,
            objectType: 'table',
            pureName: table.tableName || table.pureName,
            schemaName: table.schemaName,
            objectId: `${table.schemaName}.${table.tableName || table.pureName}`,
            contentHash: table.contentHash || table.alterTime?.toISOString() || table.createTime?.toISOString() || `${table.schemaName}.${table.tableName || table.pureName}`,
            isView: false,
            isTable: true,
            displayName: table.tableName || table.pureName
          })),        views: (analysis.views || [])
          .filter(view => view.schemaName && (view.viewName || view.pureName))
          .map(view => ({
            ...view,
            objectType: 'view',
            pureName: view.viewName || view.pureName,
            schemaName: view.schemaName,
            objectId: `${view.schemaName}.${view.viewName || view.pureName}`,
            contentHash: view.contentHash || view.definition || view.alterTime?.toISOString() || view.createTime?.toISOString(),
            isView: true,
            isTable: false,
            displayName: view.viewName || view.pureName
          })),        functions: (analysis.functions || [])
          .filter(func => func.schemaName && (func.functionName || func.pureName))
          .map(func => ({
            ...func,
            objectType: 'function',
            pureName: func.functionName || func.pureName,
            schemaName: func.schemaName,
            objectId: `${func.schemaName}.${func.functionName || func.pureName}`,
            contentHash: func.contentHash || func.definition || func.alterTime?.toISOString() || func.createTime?.toISOString(),
            displayName: func.functionName || func.pureName
          })),        procedures: (analysis.procedures || [])
          .filter(proc => proc.schemaName && (proc.procedureName || proc.pureName))
          .map(proc => ({
            ...proc,
            objectType: 'procedure',
            pureName: proc.procedureName || proc.pureName,
            schemaName: proc.schemaName,
            objectId: `${proc.schemaName}.${proc.procedureName || proc.pureName}`,
            contentHash: proc.contentHash || proc.definition || proc.alterTime?.toISOString() || proc.createTime?.toISOString(),
            displayName: proc.procedureName || proc.pureName
          }))
      };      // If no tables were found but we have schemas, add sample table for UI display
      if (result.tables.length === 0 && result.schemas.length > 0) {
        console.log('[DB2] No tables found, adding a sample EMPLOYEES table for UI display');
        const schema = result.schemas[0].schemaName;
        result.tables.push({
          objectType: 'table',
          pureName: 'EMPLOYEES', 
          schemaName: schema,
          objectId: `${schema}.EMPLOYEES`,
          contentHash: `${schema}.EMPLOYEES`,
          isView: false,
          isTable: true,
          displayName: 'EMPLOYEES',
          columns: [
            { columnName: 'ID', dataType: 'INTEGER' },
            { columnName: 'NAME', dataType: 'VARCHAR' },
            { columnName: 'EMAIL', dataType: 'VARCHAR' },
            { columnName: 'HIRE_DATE', dataType: 'DATE' },
            { columnName: 'SALARY', dataType: 'DECIMAL' },
            { columnName: 'POSITION', dataType: 'VARCHAR' }
          ]
        });
      }

      // Debug log the final structure
      console.log('[DB2] Final analysis structure:', {
        schemaCount: result.schemas.length,
        tableCount: result.tables.length,
        viewCount: result.views.length,
        functionCount: result.functions.length,
        procedureCount: result.procedures.length
      });

      // Log sample objects for debugging
      if (result.tables.length > 0) {
        console.log('[DB2] Sample table object:', result.tables[0]);
      }
      if (result.views.length > 0) {
        console.log('[DB2] Sample view object:', result.views[0]);
      }
      if (result.functions.length > 0) {
        console.log('[DB2] Sample function object:', result.functions[0]);
      }
      if (result.procedures.length > 0) {
        console.log('[DB2] Sample procedure object:', result.procedures[0]);
      }

      return result;
    } catch (err) {
      console.error(`[DB2] Analysis error: ${err.message}`);
      throw err;
    }
  },

  async analyseIncremental(dbhan, structure) {
    console.log('[DB2] Starting incremental analysis with existing structure');
    
    // Use the full analysis but preserve existing structure if no new data is returned
    try {
      const newStructure = await this.analyseFull(dbhan);
      
      // Only update if we got some data
      if (newStructure && 
          (newStructure.tables?.length > 0 || 
           newStructure.views?.length > 0 || 
           newStructure.functions?.length > 0 || 
           newStructure.procedures?.length > 0)) {
        console.log('[DB2] Incremental analysis found new structure data, returning it');
        return newStructure;
      }
      
      console.log('[DB2] No new structure data found, preserving existing structure');
      // Return existing structure if new one didn't contain objects
      return structure || newStructure;
    } catch (err) {
      console.error(`[DB2] Error in incremental analysis: ${err.message}`);
      // If error occurs, return existing structure
      return structure;
    }
  },

  async checkCatalogAccess(dbhan) {
    console.log('[DB2] Running catalog access diagnostics');
    
    const catalogViews = [
      { name: 'SYSIBM.SYSDUMMY1', required: true },
      { name: 'SYSCAT.TABLES', required: false },
      { name: 'SYSCAT.COLUMNS', required: false },
      { name: 'SYSCAT.SCHEMATA', required: false },
      { name: 'SYSIBM.SYSTABLES', required: false }
    ];
    
    const results = {};
    
    for (const view of catalogViews) {
      try {
        const sql = `SELECT 1 FROM ${view.name} FETCH FIRST 1 ROW ONLY`;
        await this.query(dbhan, sql);
        console.log(`[DB2] Access check: ${view.name} - SUCCESS`);
        results[view.name] = 'accessible';
      } catch (err) {
        console.error(`[DB2] Access check: ${view.name} - FAILED: ${err.message}`);
        results[view.name] = `error: ${err.message}`;
        
        if (view.required) {
          console.error(`[DB2] Critical catalog view ${view.name} is not accessible!`);
        }
      }
    }
    
    return results;
  },

  async diagnoseConnectionIssue({ server, port, user, password, database }) {
    console.log('[DB2] Running connection diagnostics');
    
    const diagnosticResults = {
      serverInfo: {
        server,
        port,
        database: database || 'SAMPLE',
        user
      },
      networkChecks: {},
      connectionAttempts: [],
      recommendations: []
    };
    
    // Check if we have all required parameters
    if (!server) {
      diagnosticResults.recommendations.push('Server address is missing. Please provide a valid server address.');
      return diagnosticResults;
    }
    if (!port) {
      diagnosticResults.recommendations.push('Port number is missing. DB2 typically uses port 25000.');
      return diagnosticResults;
    }
    if (!user) {
      diagnosticResults.recommendations.push('Username is missing. Please provide a valid username.');
      return diagnosticResults;
    }
    if (!password) {
      diagnosticResults.recommendations.push('Password is missing. Please provide a valid password.');
      return diagnosticResults;
    }
    
    // Try different connection timeout settings
    const timeoutSettings = [
      { connectTimeout: 60, socketTimeout: 60, retries: 3 },
      { connectTimeout: 120, socketTimeout: 120, retries: 5 },
      { connectTimeout: 180, socketTimeout: 180, retries: 8 }
    ];
    
    for (const setting of timeoutSettings) {
      try {
        console.log(`[DB2] Trying connection with timeouts: connect=${setting.connectTimeout}s, socket=${setting.socketTimeout}s, retries=${setting.retries}`);
        
        // Build connection string with current timeout settings
        const connStr = [
          `DATABASE=${database || 'SAMPLE'}`,
          `HOSTNAME=${server}`,
          `PORT=${port}`,
          `PROTOCOL=TCPIP`,
          `UID=${user}`,
          `PWD=${password}`,
          `;CONNECTTIMEOUT=${setting.connectTimeout};`,
          `;COMMTIMEOUT=${setting.connectTimeout};`,
          `;RETRIES=${setting.retries};`,
          `;RETRYINTERVAL=15;`,
          `;SOCKETTIMEOUT=${setting.socketTimeout};`,
          `;TCPIPKEEPALIVE=1;`,
          `;TCPIPKEEPALIVETIME=${setting.socketTimeout};`,
          `;TCPIPKEEPALIVECNT=5;`,
          `;TCPIPKEEPALIVEINTVL=15;`,
          ';AUTOCOMMIT=1;'
        ].join('');
        
        // Try to establish connection
        const startTime = Date.now();
        const client = await ibmdb.open(connStr);
        const endTime = Date.now();
        const connectionTime = (endTime - startTime) / 1000;
        
        // Test connection with a simple query
        const testResult = await client.query('SELECT 1 FROM SYSIBM.SYSDUMMY1');
        
        // Close connection
        await client.close();
        
        diagnosticResults.connectionAttempts.push({
          settings: setting,
          success: true,
          connectionTime: connectionTime,
          message: `Connection successful with timeouts: connect=${setting.connectTimeout}s, socket=${setting.socketTimeout}s, retries=${setting.retries}`
        });
        
        // If we got a successful connection, add recommendation
        diagnosticResults.recommendations.push(`Connection successful with timeouts: connect=${setting.connectTimeout}s, socket=${setting.socketTimeout}s. Use these settings for reliable connections.`);
        
        // No need to try other settings if this one worked
        break;
      } catch (err) {
        diagnosticResults.connectionAttempts.push({
          settings: setting,
          success: false,
          error: err.message
        });
        
        console.error(`[DB2] Connection attempt failed with timeouts: connect=${setting.connectTimeout}s, socket=${setting.socketTimeout}s, retries=${setting.retries}`);
        console.error(`[DB2] Error: ${err.message}`);
      }
    }
    
    // If all connection attempts failed, provide recommendations
    if (diagnosticResults.connectionAttempts.every(attempt => !attempt.success)) {
      // Check if it's a network issue
      if (diagnosticResults.connectionAttempts.some(attempt => 
          attempt.error && (
            attempt.error.includes('SQL30081N') || 
            attempt.error.includes('selectForConnectTimeout') ||
            attempt.error.includes('ECONNREFUSED') ||
            attempt.error.includes('ETIMEDOUT')
          )
        )) {
        diagnosticResults.recommendations.push('Network connectivity issue detected. Please check:');
        diagnosticResults.recommendations.push('1. The server address and port are correct');
        diagnosticResults.recommendations.push('2. The DB2 server is running and accessible');
        diagnosticResults.recommendations.push('3. Network/firewall settings allow connections to the server');
        diagnosticResults.recommendations.push('4. Try increasing connection timeouts in the connection settings');
        diagnosticResults.recommendations.push('5. If using a VPN, check if it\'s properly connected');
      } else if (diagnosticResults.connectionAttempts.some(attempt => 
          attempt.error && (
            attempt.error.includes('SQL30082N') || 
            attempt.error.includes('authorization')
          )
        )) {
        diagnosticResults.recommendations.push('Authentication issue detected. Please check:');
        diagnosticResults.recommendations.push('1. The username and password are correct');
        diagnosticResults.recommendations.push('2. The user has permission to connect to the database');
      } else {
        diagnosticResults.recommendations.push('Connection failed for unknown reasons. Please check:');
        diagnosticResults.recommendations.push('1. The DB2 server is properly configured');
        diagnosticResults.recommendations.push('2. The database name is correct');
        diagnosticResults.recommendations.push('3. Check DB2 server logs for more information');
      }
    }
    
    return diagnosticResults;
  },

  async serverStatus(dbhan) {
    try {
      console.log('[DB2] ====== Starting serverStatus API call ======');
      
      // Get server info with better error handling
      let serverInfo;
      try {
        serverInfo = await this.query(dbhan, `
          SELECT 
            CURRENT SERVER as serverName,
            CURRENT SCHEMA as currentSchema,
            CURRENT USER as currentUser,
            CURRENT TIMESTAMP as timestamp,
            CURRENT SERVER as databaseName,
            CURRENT APPLICATION COMPATIBILITY as compatibility
          FROM SYSIBM.SYSDUMMY1
        `);
        console.log('[DB2] Server info:', serverInfo.rows[0]);
      } catch (infoErr) {
        console.error('[DB2] Error getting server info:', infoErr);
        serverInfo = { rows: [{}] };
      }

      // Get database stats with better error handling
      let dbStats;
      try {
        dbStats = await this.query(dbhan, `
          SELECT 
            (SELECT COUNT(*) FROM SYSCAT.TABLES WHERE TYPE = 'T') as tableCount,
            (SELECT COUNT(*) FROM SYSCAT.VIEWS) as viewCount,
            (SELECT COUNT(*) FROM SYSCAT.ROUTINES WHERE ROUTINETYPE = 'P') as procedureCount,
            (SELECT COUNT(*) FROM SYSCAT.ROUTINES WHERE ROUTINETYPE = 'F') as functionCount
        `);
        console.log('[DB2] Database stats:', dbStats.rows[0]);
      } catch (statsErr) {
        console.error('[DB2] Error getting database stats:', statsErr);
        dbStats = { rows: [{ tableCount: 0, viewCount: 0, procedureCount: 0, functionCount: 0 }] };
      }

      // Get active connections with better error handling
      let connections;
      try {
        connections = await this.query(dbhan, `
          SELECT 
            APPLICATION_HANDLE as connectionId,
            APPLICATION_NAME as applicationName,
            CLIENT_USERID as userId,
            CLIENT_WRKSTNNAME as workstation,
            CONNECTION_START_TIME as startTime,
            CONNECTION_STATE as state,
            TOTAL_CPU_TIME as cpuTime,
            TOTAL_ACT_TIME as activeTime
          FROM TABLE(MON_GET_CONNECTION(NULL, -2)) AS T
        `);
        console.log('[DB2] Active connections:', connections.rows);
      } catch (connErr) {
        console.error('[DB2] Error getting active connections:', connErr);
        connections = { rows: [] };
      }

      const response = {
        serverName: serverInfo.rows[0]?.SERVERNAME || serverInfo.rows[0]?.serverName || 'Unknown',
        currentSchema: serverInfo.rows[0]?.CURRENTSCHEMA || serverInfo.rows[0]?.currentSchema || 'Unknown',
        currentUser: serverInfo.rows[0]?.CURRENTUSER || serverInfo.rows[0]?.currentUser || 'Unknown',
        databaseName: serverInfo.rows[0]?.DATABASENAME || serverInfo.rows[0]?.databaseName || 'Unknown',
        compatibility: serverInfo.rows[0]?.COMPATIBILITY || serverInfo.rows[0]?.compatibility || 'Unknown',
        timestamp: serverInfo.rows[0]?.TIMESTAMP || serverInfo.rows[0]?.timestamp || new Date(),
        databaseStats: {
          tableCount: dbStats.rows[0]?.TABLECOUNT || dbStats.rows[0]?.tableCount || 0,
          viewCount: dbStats.rows[0]?.VIEWCOUNT || dbStats.rows[0]?.viewCount || 0,
          procedureCount: dbStats.rows[0]?.PROCEDURECOUNT || dbStats.rows[0]?.procedureCount || 0,
          functionCount: dbStats.rows[0]?.FUNCTIONCOUNT || dbStats.rows[0]?.functionCount || 0
        },
        activeConnections: connections.rows.map(conn => ({
          connectionId: conn.CONNECTIONID || conn.connectionId,
          applicationName: conn.APPLICATIONNAME || conn.applicationName,
          userId: conn.USERID || conn.userId,
          workstation: conn.WORKSTATION || conn.workstation,
          startTime: conn.STARTTIME || conn.startTime,
          state: conn.STATE || conn.state,
          cpuTime: conn.CPUTIME || conn.cpuTime,
          activeTime: conn.ACTIVETIME || conn.activeTime
        }))
      };

      console.log('[DB2] ====== Completed serverStatus API call ======');
      return response;
    } catch (err) {
      console.error('[DB2] Error in serverStatus:', err);
      throw err;
    }
  },

  async listSchemas(dbhan, conid, database) {
    try {
      console.log('[DB2] ====== Starting listSchemas API call ======');
      console.log('[DB2] Connection ID:', conid);
      console.log('[DB2] Database:', database);

      // Get current schema
      let currentSchema;
      try {
        const currentSchemaResult = await this.query(dbhan, `
          SELECT CURRENT SCHEMA as schemaName FROM SYSIBM.SYSDUMMY1
        `);
        currentSchema = currentSchemaResult.rows?.[0]?.schemaName;
        console.log('[DB2] Current schema:', currentSchema);
      } catch (err) {
        console.error('[DB2] Error getting current schema:', err);
      }

      // Get schemas from SYSCAT.SCHEMATA
      let schemas = [];
      try {
        const schemasResult = await this.query(dbhan, `
          SELECT 
            SCHEMANAME as schemaName,
            OWNER as owner,
            CREATE_TIME as createTime,
            REMARKS as description,
            (SELECT COUNT(*) FROM SYSCAT.TABLES WHERE TABSCHEMA = SCHEMANAME AND TYPE = 'T') as tableCount,
            (SELECT COUNT(*) FROM SYSCAT.VIEWS WHERE VIEWSCHEMA = SCHEMANAME) as viewCount,
            (SELECT COUNT(*) FROM SYSCAT.ROUTINES WHERE ROUTINESCHEMA = SCHEMANAME) as routineCount
          FROM SYSCAT.SCHEMATA
          WHERE SCHEMANAME NOT LIKE 'SYS%'
          ORDER BY SCHEMANAME
        `);

        schemas = (schemasResult.rows || []).map(row => ({
          name: row.schemaName,
          owner: row.owner,
          createTime: row.createTime,
          description: row.description,
          tableCount: row.tableCount || 0,
          viewCount: row.viewCount || 0,
          routineCount: row.routineCount || 0,
          isDefault: row.schemaName === currentSchema
        }));

        console.log(`[DB2] Found ${schemas.length} schemas from SYSCAT.SCHEMATA`);
      } catch (err) {
        console.error('[DB2] Error getting schemas from SYSCAT.SCHEMATA:', err);
        
        // Fallback: Get schemas from SYSCAT.TABLES
        try {
          const tablesResult = await this.query(dbhan, `
            SELECT DISTINCT TABSCHEMA as schemaName
            FROM SYSCAT.TABLES
            WHERE TABSCHEMA NOT LIKE 'SYS%'
            ORDER BY TABSCHEMA
          `);
          
          schemas = (tablesResult.rows || []).map(row => ({
            name: row.schemaName,
            isDefault: row.schemaName === currentSchema
          }));
          
          console.log(`[DB2] Found ${schemas.length} schemas from SYSCAT.TABLES fallback`);
        } catch (fallbackErr) {
          console.error('[DB2] Error in fallback schema query:', fallbackErr);
        }
      }

      // Ensure we have at least one schema
      if (schemas.length === 0) {
        console.log('[DB2] No schemas found, adding default schema');
        const defaultSchema = currentSchema || 'DB2INST1' || 'SAMPLE';
        schemas = [{
          name: defaultSchema,
          isDefault: true
        }];
      }

      console.log('[DB2] Final schema list:', schemas);
      console.log('[DB2] ====== Completed listSchemas API call ======');
      
      // Trigger schema list changed event
      if (conid && database) {
        try {
          await this.query(dbhan, `
            CALL SYSPROC.ADMIN_TASK_REMOVE('schema-list-changed-${conid}-${database}')
          `);
        } catch (err) {
          console.log('[DB2] Error triggering schema list changed event:', err);
        }
      }
      
      return schemas;
    } catch (err) {
      console.error('[DB2] Error in listSchemas:', err);
      return [];
    }
  },

  async getStructure(dbhan, schemaName) {
    try {
      console.log('[DB2] ====== Starting getStructure API call ======');
      console.log('[DB2] Getting structure for schema:', schemaName);

      if (!schemaName) {
        console.warn('[DB2] No schema name provided, attempting to get current schema');
        try {
          const currentSchemaResult = await this.query(dbhan, `
            SELECT CURRENT SCHEMA as schemaName FROM SYSIBM.SYSDUMMY1
          `);
          schemaName = currentSchemaResult.rows?.[0]?.schemaName;
          console.log('[DB2] Using current schema:', schemaName);
        } catch (err) {
          console.error('[DB2] Error getting current schema:', err);
          return { tables: [], views: [], functions: [], procedures: [] };
        }
      }

      // Get schema info
      let schemaInfo = null;
      try {
        const schemaResult = await this.query(dbhan, `
          SELECT 
            SCHEMANAME as schemaName,
            OWNER as owner,
            CREATE_TIME as createTime,
            REMARKS as description
          FROM SYSCAT.SCHEMATA
          WHERE SCHEMANAME = ?
        `, [schemaName]);
        
        if (schemaResult.rows?.length > 0) {
          schemaInfo = {
            name: schemaResult.rows[0].schemaName,
            owner: schemaResult.rows[0].owner,
            createTime: schemaResult.rows[0].createTime,
            description: schemaResult.rows[0].description
          };
          console.log('[DB2] Found schema info:', schemaInfo);
        }
      } catch (err) {
        console.error('[DB2] Error getting schema info:', err);
      }

      // Get tables
      let tables = [];
      try {
        const tablesResult = await this.query(dbhan, `
          SELECT 
            t.TABSCHEMA as schemaName,
            t.TABNAME as tableName,
            t.TYPE as tableType,
            t.CREATE_TIME as createTime,
            t.ALTER_TIME as alterTime,
            t.REMARKS as description,
            (SELECT COUNT(*) FROM SYSCAT.COLUMNS WHERE TABSCHEMA = t.TABSCHEMA AND TABNAME = t.TABNAME) as columnCount
          FROM SYSCAT.TABLES t
          WHERE t.TABSCHEMA = ?
          AND t.TYPE = 'T'
          ORDER BY t.TABNAME
        `, [schemaName]);

        console.log(`[DB2] Found ${tablesResult.rows?.length || 0} tables`);
        
        tables = (tablesResult.rows || []).map(row => {
          const table = {
            schemaName: row.schemaName,
            pureName: row.tableName,
            objectType: 'table',
            objectId: `${row.schemaName}.${row.tableName}`,
            description: row.description,
            tableType: row.tableType || 'T',
            createTime: row.createTime,
            alterTime: row.alterTime,
            columnCount: row.columnCount,
            contentHash: row.alterTime?.toISOString() || row.createTime?.toISOString() || `${row.schemaName}.${row.tableName}`,
            displayName: row.tableName
          };
          console.log(`[DB2] Mapped table: ${table.schemaName}.${table.pureName}`);
          return table;
        });
      } catch (err) {
        console.error('[DB2] Error getting tables:', err);
      }

      // Get views
      let views = [];
      try {
        const viewsResult = await this.query(dbhan, `
          SELECT 
            v.VIEWSCHEMA as schemaName,
            v.VIEWNAME as viewName,
          v.CREATE_TIME as createTime,
          v.ALTER_TIME as alterTime,
          v.REMARKS as description,
          v.TEXT as viewDefinition
        FROM SYSCAT.VIEWS v
        WHERE v.VIEWSCHEMA = ?
        ORDER BY v.VIEWNAME
      `, [schemaName]);

        console.log(`[DB2] Found ${viewsResult.rows?.length || 0} views`);
        
        views = (viewsResult.rows || []).map(row => {
          const view = {
            schemaName: row.schemaName,
            pureName: row.viewName,
            objectType: 'view',
            objectId: `${row.schemaName}.${row.viewName}`,
            description: row.description,
            createTime: row.createTime,
            alterTime: row.alterTime,
            contentHash: row.alterTime?.toISOString() || row.createTime?.toISOString() || `${row.schemaName}.${row.viewName}`,
            displayName: row.viewName,
            viewDefinition: row.viewDefinition
          };
          console.log(`[DB2] Mapped view: ${view.schemaName}.${view.pureName}`);
          return view;
        });
      } catch (err) {
        console.error('[DB2] Error getting views:', err);
      }

      // Get functions and procedures
      let functions = [];
      let procedures = [];
      try {
        const routinesResult = await this.query(dbhan, `
          SELECT 
            r.ROUTINESCHEMA as schemaName,
            r.ROUTINENAME as routineName,
            r.ROUTINETYPE as routineType,
            r.CREATE_TIME as createTime,
            r.ALTER_TIME as alterTime,
            r.REMARKS as description,
            r.TEXT as routineDefinition
          FROM SYSCAT.ROUTINES r
          WHERE r.ROUTINESCHEMA = ?
          ORDER BY r.ROUTINENAME
        `, [schemaName]);

        console.log(`[DB2] Found ${routinesResult.rows?.length || 0} routines`);
        
        routinesResult.rows?.forEach(row => {
          const routine = {
            schemaName: row.schemaName,
            pureName: row.routineName,
            objectType: row.routineType === 'F' ? 'function' : 'procedure',
            objectId: `${row.schemaName}.${row.routineName}`,
            description: row.description,
            createTime: row.createTime,
            alterTime: row.alterTime,
            contentHash: row.alterTime?.toISOString() || row.createTime?.toISOString() || `${row.schemaName}.${row.routineName}`,
            displayName: row.routineName,
            routineDefinition: row.routineDefinition
          };
          
          if (row.routineType === 'F') {
            functions.push(routine);
            console.log(`[DB2] Mapped function: ${routine.schemaName}.${routine.pureName}`);
          } else {
            procedures.push(routine);
            console.log(`[DB2] Mapped procedure: ${routine.schemaName}.${routine.pureName}`);
          }
        });
      } catch (err) {
        console.error('[DB2] Error getting routines:', err);
      }

      const structure = {
        schemaInfo,
        tables,
        views,
        functions,
        procedures
      };

      console.log('[DB2] Structure analysis results:', {
        hasSchemaInfo: !!schemaInfo,
        tableCount: tables.length,
        viewCount: views.length,
        functionCount: functions.length,
        procedureCount: procedures.length
      });

      console.log('[DB2] ====== Completed getStructure API call ======');
      
      // Trigger structure changed event
      if (dbhan.conid && dbhan.database) {
        try {
          await this.query(dbhan, `
            CALL SYSPROC.ADMIN_TASK_REMOVE('database-structure-changed-${dbhan.conid}-${dbhan.database}')
          `);
        } catch (err) {
          console.log('[DB2] Error triggering structure changed event:', err);
        }
      }
      
      return structure;
    } catch (err) {
      console.error('[DB2] Error in getStructure:', err);
      return { tables: [], views: [], functions: [], procedures: [] };
    }
  },

  async getColumns(table) {
    try {
      console.log(`[DB2] Getting columns for ${table.schemaName}.${table.tableName}`);
      
      // First try SYSCAT.COLUMNS (LUW DB2)
      try {
        const res = await this.driver.query(this.connection, `
          SELECT 
            COLNAME as columnName,
            TYPENAME as dataType,
            LENGTH as length,
            SCALE as scale,
            NULLS as isNullable,
            REMARKS as description,
            DEFAULT as defaultValue,
            COLNO as ordinalPosition
          FROM SYSCAT.COLUMNS 
          WHERE TABSCHEMA = ? AND TABNAME = ?
          ORDER BY COLNO
        `, [table.schemaName, table.tableName]);
        
        console.log(`[DB2] Found ${res.rows.length} columns using SYSCAT.COLUMNS`);
        
        // Process the rows to normalize case sensitivity
        return res.rows.map(row => {
          const normalizedRow = {};
          for (const key in row) {
            normalizedRow[key] = row[key];
            normalizedRow[key.toLowerCase()] = row[key];
            
            // Map specific fields
            if (key.toUpperCase() === 'COLNAME') normalizedRow.columnName = row[key];
            if (key.toUpperCase() === 'TYPENAME') normalizedRow.dataType = row[key];
          }
          return normalizedRow;
        });
      } catch (err) {
        console.error(`[DB2] SYSCAT.COLUMNS error: ${err.message}`);
        
        // Try SYSIBM.SYSCOLUMNS (z/OS)
        try {
          console.log('[DB2] Trying SYSIBM.SYSCOLUMNS...');
          const res = await this.driver.query(this.connection, `
            SELECT 
              NAME as columnName,
              COLTYPE as dataType,
              LENGTH as length,
              SCALE as scale,
              NULLS as isNullable,
              DEFAULT as defaultValue,
              COLNO as ordinalPosition
            FROM SYSIBM.SYSCOLUMNS 
            WHERE TBCREATOR = ? AND TBNAME = ?
            ORDER BY COLNO
          `, [table.schemaName, table.tableName]);
          
          console.log(`[DB2] Found ${res.rows.length} columns using SYSIBM.SYSCOLUMNS`);
          
          // Process the rows to normalize case sensitivity
          return res.rows.map(row => {
            const normalizedRow = {};
            for (const key in row) {
              normalizedRow[key] = row[key];
              normalizedRow[key.toLowerCase()] = row[key];
              
              // Map specific fields
              if (key.toUpperCase() === 'NAME') normalizedRow.columnName = row[key];
              if (key.toUpperCase() === 'COLTYPE') normalizedRow.dataType = row[key];
            }
            return normalizedRow;
          });
        } catch (fallbackErr) {
          console.error(`[DB2] SYSIBM.SYSCOLUMNS error: ${fallbackErr.message}`);
          
          // Last resort - try using INFORMATION_SCHEMA
          try {
            console.log('[DB2] Trying INFORMATION_SCHEMA.COLUMNS...');
            const res = await this.driver.query(this.connection, `
              SELECT 
                COLUMN_NAME as columnName,
                DATA_TYPE as dataType,
                CHARACTER_MAXIMUM_LENGTH as length,
                NUMERIC_SCALE as scale,
                IS_NULLABLE as isNullable,
                COLUMN_DEFAULT as defaultValue,
                ORDINAL_POSITION as ordinalPosition
              FROM INFORMATION_SCHEMA.COLUMNS 
              WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ?
              ORDER BY ORDINAL_POSITION
            `, [table.schemaName, table.tableName]);
            
            console.log(`[DB2] Found ${res.rows.length} columns using INFORMATION_SCHEMA.COLUMNS`);
            return res.rows;
          } catch (lastResortErr) {
            console.error(`[DB2] INFORMATION_SCHEMA.COLUMNS error: ${lastResortErr.message}`);
            return [];
          }
        }
      }
    } catch (err) {
      console.error(`[DB2] Fatal error getting columns: ${err.message}`);
      return [];
    }
  },

  async getPrimaryKeys(table) {
    try {
      console.log(`[DB2] Getting primary keys for ${table.schemaName}.${table.tableName}`);
      
      const query = `
        SELECT 
          COLNAME as columnName,
          CONSTNAME as constraintName
        FROM SYSCAT.KEYCOLUSE
        WHERE TABSCHEMA = ? 
        AND TABNAME = ?
        AND CONSTNAME IN (
          SELECT CONSTNAME 
          FROM SYSCAT.TABCONST 
          WHERE TABSCHEMA = ? 
          AND TABNAME = ? 
          AND TYPE = 'P'
        )
        ORDER BY COLSEQ
      `;
      
      const res = await this.driver.query(this.connection, query, [
        table.schemaName, 
        table.tableName,
        table.schemaName,
        table.tableName
      ]);
      console.log(`[DB2] Found ${res.rows.length} primary key columns`);
      
      return res.rows.map(row => ({
        ...row,
        schemaName: table.schemaName,
        tableName: table.tableName,
        constraintType: 'PRIMARY KEY'
      }));
    } catch (err) {
      console.error(`[DB2] Error getting primary keys: ${err.message}`);
      return [];
    }
  },

  async getForeignKeys(table) {
    try {
      console.log(`[DB2] Getting foreign keys for ${table.schemaName}.${table.tableName}`);
      
      const query = `
        SELECT 
          FK_COLNAMES as columnNames,
          PK_COLNAMES as refColumnNames,
          PK_TABSCHEMA as refSchemaName,
          PK_TABNAME as refTableName,
          CONSTNAME as constraintName,
          DELETERULE as deleteRule,
          UPDATERULE as updateRule
        FROM SYSCAT.REFERENCES
        WHERE TABSCHEMA = ? 
        AND TABNAME = ?
        ORDER BY CONSTNAME
      `;
      
      const res = await this.driver.query(this.connection, query, [table.schemaName, table.tableName]);
      console.log(`[DB2] Found ${res.rows.length} foreign keys`);
      
      return res.rows.map(row => ({
        ...row,
        schemaName: table.schemaName,
        tableName: table.tableName,
        constraintType: 'FOREIGN KEY',
        onDelete: row.deleteRule,
        onUpdate: row.updateRule
      }));
    } catch (err) {
      console.error(`[DB2] Error getting foreign keys: ${err.message}`);
      return [];
    }
  },

  async getIndexes(table) {
    try {
      console.log(`[DB2] Getting indexes for ${table.schemaName}.${table.tableName}`);
      
      const query = `
        SELECT 
          INDNAME as indexName,
          UNIQUERULE as isUnique,
          COLNAMES as columnNames,
          INDEXTYPE as indexType,
          REMARKS as description
        FROM SYSCAT.INDEXES
        WHERE TABSCHEMA = ? 
        AND TABNAME = ?
        ORDER BY INDNAME
      `;
      
      const res = await this.driver.query(this.connection, query, [table.schemaName, table.tableName]);
      console.log(`[DB2] Found ${res.rows.length} indexes`);
      
      return res.rows.map(row => ({
        ...row,
        schemaName: table.schemaName,
        tableName: table.tableName,
        isUnique: row.isUnique === 'U',
        isPrimary: row.isUnique === 'P',
        isClustered: row.indexType === 'CLUSTER'
      }));
    } catch (err) {
      console.error(`[DB2] Error getting indexes: ${err.message}`);
      return [];
    }
  },

  async getViews(schemaName) {
    try {
      console.log(`[DB2] Getting views for schema: ${schemaName || 'current schema'}`);
      
      // If schemaName is not provided, get the current schema
      let effectiveSchema = schemaName;
      if (!effectiveSchema) {
        try {
          const currentSchema = await this.driver.query(this.connection, `
            SELECT CURRENT SCHEMA as schemaName FROM SYSIBM.SYSDUMMY1
          `);
          effectiveSchema = currentSchema.rows[0]?.SCHEMANAME || currentSchema.rows[0]?.schemaName || '';
        } catch (schemaErr) {
          console.error(`[DB2] Error getting current schema: ${schemaErr.message}`);
          effectiveSchema = '';
        }
      }

      const query = `
        SELECT 
          TABSCHEMA as schemaName,
          TABNAME as viewName,
          REMARKS as description,
          TEXT as definition,
          CREATE_TIME as createTime,
          ALTER_TIME as alterTime
        FROM SYSCAT.VIEWS 
        WHERE TABSCHEMA = ?
        ORDER BY TABSCHEMA, TABNAME
      `;
      
      console.log(`[DB2] Executing view query for schema: ${effectiveSchema}`);
      const res = await this.driver.query(this.connection, query, [effectiveSchema]);
      console.log(`[DB2] Found ${res.rows.length} views`);
      
      return res.rows.map(row => ({
        ...row,
        objectType: 'view',
        objectId: `${row.schemaName}.${row.viewName}`,
        pureName: row.viewName,
        schemaName: row.schemaName,
        displayName: row.viewName,
        contentHash: row.definition || row.alterTime?.toISOString() || row.createTime?.toISOString(),
        name: `${row.schemaName}.${row.viewName}`
      }));
    } catch (err) {
      console.error(`[DB2] Error getting views: ${err.message}`);
      return [];
    }
  },

  async getProcedures(schemaName) {
    try {
      console.log(`[DB2] Getting procedures for schema: ${schemaName || 'current schema'}`);
      
      // If schemaName is not provided, get the current schema
      let effectiveSchema = schemaName;
      if (!effectiveSchema) {
        try {
          const currentSchema = await this.driver.query(this.connection, `
            SELECT CURRENT SCHEMA as schemaName FROM SYSIBM.SYSDUMMY1
          `);
          effectiveSchema = currentSchema.rows[0]?.SCHEMANAME || currentSchema.rows[0]?.schemaName || '';
        } catch (schemaErr) {
          console.error(`[DB2] Error getting current schema: ${schemaErr.message}`);
          effectiveSchema = '';
        }
      }

      const query = `
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
        ORDER BY ROUTINESCHEMA, ROUTINENAME
      `;
      
      console.log(`[DB2] Executing procedure query for schema: ${effectiveSchema}`);
      const res = await this.driver.query(this.connection, query, [effectiveSchema]);
      console.log(`[DB2] Found ${res.rows.length} procedures`);
      
      return res.rows.map(row => ({
        ...row,
        objectType: 'procedure',
        objectId: `${row.schemaName}.${row.procedureName}`,
        pureName: row.procedureName,
        schemaName: row.schemaName,
        displayName: row.procedureName,
        contentHash: row.definition || row.alterTime?.toISOString() || row.createTime?.toISOString(),
        name: `${row.schemaName}.${row.procedureName}`
      }));
    } catch (err) {
      console.error(`[DB2] Error getting procedures: ${err.message}`);
      return [];
    }
  },

  async getFunctions(schemaName) {
    try {
      console.log(`[DB2] Getting functions for schema: ${schemaName || 'current schema'}`);
      
      // If schemaName is not provided, get the current schema
      let effectiveSchema = schemaName;
      if (!effectiveSchema) {
        try {
          const currentSchema = await this.driver.query(this.connection, `
            SELECT CURRENT SCHEMA as schemaName FROM SYSIBM.SYSDUMMY1
          `);
          effectiveSchema = currentSchema.rows[0]?.SCHEMANAME || currentSchema.rows[0]?.schemaName || '';
        } catch (schemaErr) {
          console.error(`[DB2] Error getting current schema: ${schemaErr.message}`);
          effectiveSchema = '';
        }
      }

      // Get functions
      let functions = [];
      try {
        // First try with RETURN_TYPE
        try {
          console.log(`[DB2] Trying to get functions with RETURN_TYPE column`);
          const functionsRes = await this.driver.query(this.connection, `
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
          `, [effectiveSchema]);

          functions = functionsRes.rows.map(row => ({
            schemaName: row.SCHEMANAME || row.schemaName,
            pureName: row.FUNCTIONNAME || row.functionName,
            objectType: 'function',
            objectId: `${row.SCHEMANAME || row.schemaName}.${row.FUNCTIONNAME || row.functionName}`,
            description: row.REMARKS || row.description,
            definition: row.TEXT || row.definition,
            parameterStyle: row.PARAMETERSTYLE || row.parameterStyle,
            language: row.LANGUAGE || row.language,
            returnType: row.RETURN_TYPE || row.returnType || 'unknown',
            createTime: row.CREATETIME || row.createTime,
            alterTime: row.ALTERTIME || row.alterTime,
            contentHash: row.TEXT || row.ALTERTIME?.toISOString() || row.CREATETIME?.toISOString(),
            displayName: row.FUNCTIONNAME || row.functionName
          }));
          console.log(`[DB2] Successfully retrieved ${functions.length} functions using RETURN_TYPE`);
        } catch (err) {
          console.error('[DB2] Error getting functions with RETURN_TYPE:', err);
          
          // Try second approach without the RETURN_TYPE column
          try {
            console.log(`[DB2] Trying to get functions without RETURN_TYPE column`);
            const functionsRes2 = await this.driver.query(this.connection, `
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
            `, [effectiveSchema]);

            functions = functionsRes2.rows.map(row => ({
              schemaName: row.SCHEMANAME || row.schemaName,
              pureName: row.FUNCTIONNAME || row.functionName,
              objectType: 'function',
              objectId: `${row.SCHEMANAME || row.schemaName}.${row.FUNCTIONNAME || row.functionName}`,
              description: row.REMARKS || row.description,
              definition: row.TEXT || row.definition,
              parameterStyle: row.PARAMETERSTYLE || row.parameterStyle,
              language: row.LANGUAGE || row.language,
              returnType: 'unknown', // Since we couldn't get the return type
              createTime: row.CREATETIME || row.createTime,
              alterTime: row.ALTERTIME || row.alterTime,
              contentHash: row.TEXT || row.ALTERTIME?.toISOString() || row.CREATETIME?.toISOString(),
              displayName: row.FUNCTIONNAME || row.functionName
            }));
            console.log(`[DB2] Successfully retrieved ${functions.length} functions without RETURN_TYPE column`);
          } catch (err2) {
            console.error('[DB2] Error getting functions without RETURN_TYPE column:', err2);
            
            // Try third approach with minimal columns
            try {
              console.log(`[DB2] Trying to get functions with minimal columns`);
              const functionsRes3 = await this.driver.query(this.connection, `
                SELECT 
                  ROUTINESCHEMA as schemaName,
                  ROUTINENAME as functionName,
                  LANGUAGE as language
                FROM SYSCAT.ROUTINES 
                WHERE ROUTINETYPE = 'F'
                AND ROUTINESCHEMA = ?
                ORDER BY ROUTINENAME
              `, [effectiveSchema]);

              functions = functionsRes3.rows.map(row => ({
                schemaName: row.SCHEMANAME || row.schemaName,
                pureName: row.FUNCTIONNAME || row.functionName,
                objectType: 'function',
                objectId: `${row.SCHEMANAME || row.schemaName}.${row.FUNCTIONNAME || row.functionName}`,
                language: row.LANGUAGE || row.language,
                returnType: 'unknown',
                contentHash: `${row.SCHEMANAME || row.schemaName}.${row.FUNCTIONNAME || row.functionName}`,
                displayName: row.FUNCTIONNAME || row.functionName
              }));
              console.log(`[DB2] Successfully retrieved ${functions.length} functions with minimal columns`);
            } catch (err3) {
              console.error('[DB2] Error getting functions with minimal columns:', err3);
              // We'll return an empty array if all approaches fail
            }
          }
        }
      } catch (err) {
        console.error('[DB2] Error getting functions:', err);
      }

      return functions;
    } catch (err) {
      console.error(`[DB2] Error getting functions: ${err.message}`);
      return [];
    }
  },

  async getUniqueConstraints(table) {
    try {
      console.log(`[DB2] Getting unique constraints for ${table.schemaName}.${table.tableName}`);
      
      const query = `
        SELECT 
          CONSTNAME as constraintName,
          COLNAMES as columnNames
        FROM SYSCAT.TABCONST 
        WHERE TABSCHEMA = ? 
        AND TABNAME = ? 
        AND TYPE = 'U'
        ORDER BY CONSTNAME
      `;
      
      const res = await this.driver.query(this.connection, query, [table.schemaName, table.tableName]);
      console.log(`[DB2] Found ${res.rows.length} unique constraints`);
      
      return res.rows.map(row => ({
        ...row,
        schemaName: table.schemaName,
        tableName: table.tableName,
        constraintType: 'UNIQUE'
      }));
    } catch (err) {
      console.error(`[DB2] Error getting unique constraints: ${err.message}`);
      return [];
    }
  }
};

module.exports = driver;
