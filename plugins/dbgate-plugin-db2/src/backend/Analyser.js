const { DatabaseAnalyser } = global.DBGATE_PACKAGES['dbgate-tools'];

class Analyser extends DatabaseAnalyser {
  constructor(connection, driver) {
    super(connection, driver);
    this.connection = connection;
    this.driver = driver;
  }
  _ensureUniqueColumnNames(columns, tableInfo = {}) {
    if (!columns || !Array.isArray(columns)) return [];

    console.log(
      `[DB2 Analyser] Checking uniqueness for ${
        columns.length
      } columns for table ${tableInfo.pureName || tableInfo.tableName}`
    );
    const uniqueNameMap = {};
    const result = [];

    for (let i = 0; i < columns.length; i++) {
      const column = { ...columns[i] };

      // Get a consistent column name to use with improved case handling
      let colName = '';
      if (column.columnName) colName = column.columnName;
      else if (column.COLUMNNAME) colName = column.COLUMNNAME;
      else if (column.COLNAME) colName = column.COLNAME;
      else if (column.name) colName = column.name;
      else if (column.NAME) colName = column.NAME;
      else colName = `column_${i}`;

      // Generate a unique name that includes the table name and column index
      const tableName = tableInfo.tableName || tableInfo.pureName || '';
      const schemaName = tableInfo.schemaName || '';
      const uniqueId = `${schemaName}.${tableName}.${colName}_${i}`;

      // Ensure column has all the properties needed for display
      column.columnName = colName;
      column.uniqueName = uniqueId;
      column.pureName = colName;
      column.displayName = colName;
      column.ordinalPosition =
        column.ordinalPosition || column.COLNO || column.colno || i;
      column.id = `col_${tableName}_${colName}_${i}`;

      // Add to the result array
      result.push(column);
    }

    // Double check we have no duplicates
    const nameCheck = {};
    const duplicates = [];

    for (const column of result) {
      if (nameCheck[column.uniqueName]) {
        duplicates.push(column.uniqueName);
        // Add a timestamp to ensure uniqueness
        column.uniqueName = `${column.uniqueName}_${Date.now()
          .toString()
          .slice(-6)}`;
      }
      nameCheck[column.uniqueName] = true;
    }

    if (duplicates.length > 0) {
      console.warn(
        `[DB2 Analyser] Fixed ${duplicates.length} duplicate column names`
      );
    }

    return result;
  }
  async _runAnalysis() {
    console.log('[DB2] Starting _runAnalysis');

    try {
      // Get all schemas - now returns schema objects instead of just names
      const schemas = await this.getSchemas();
      if (!schemas || schemas.length === 0) {
        console.error('[DB2] No schemas found, analysis cannot continue');
        return {
          schemas: [],
          tables: [],
          views: [],
          functions: [],
          procedures: [],
          triggers: [],
        };
      }

      console.log(`[DB2] _runAnalysis found ${schemas.length} schema objects`);

      const result = {
        schemas: schemas, // Now assigning the schema objects directly
        tables: [],
        views: [],
        functions: [],
        procedures: [],
        triggers: [],
      };

      // Make sure schemas is always an array
      const schemasArray = Array.isArray(schemas) ? schemas : [schemas]; // Analyze each schema found
      for (const schema of schemasArray) {
        // Get schema name from schema object
        const schemaName = schema.name;
        console.log(`[DB2] Analyzing schema: ${schemaName}`);

        try {
          // Use the driver's getStructure method which is already well-implemented
          const structureData = await this.driver.getStructure(
            this.connection,
            schemaName
          );

          // Validate structureData to prevent null reference errors
          if (!structureData) {
            console.error(
              `[DB2] No structure data returned for schema ${schema.name}`
            );
            continue;
          }

          // Ensure each property exists to avoid 'length' of undefined errors
          structureData.tables = structureData.tables || [];
          structureData.views = structureData.views || [];
          structureData.functions = structureData.functions || [];
          structureData.procedures = structureData.procedures || [];

          console.log(`[DB2] Got structure data for schema ${schemaName}:`, {
            tables: structureData.tables?.length || 0,
            views: structureData.views?.length || 0,
            functions: structureData.functions?.length || 0,
            procedures: structureData.procedures?.length || 0,
          });

          // Add tables from this schema to result
          result.tables = result.tables.concat(structureData.tables);

          // Add views from this schema to result
          result.views = result.views.concat(structureData.views);

          // Add functions from this schema to result
          result.functions = result.functions.concat(structureData.functions);
          // Add procedures from this schema to result
          result.procedures = result.procedures.concat(
            structureData.procedures
          );

          // Add triggers from this schema to result
          result.triggers = result.triggers.concat(
            structureData.triggers || []
          );
        } catch (schemaErr) {
          console.error(
            `[DB2] Error analyzing schema ${schema.name}: ${schemaErr.message}`
          );
          // Fallback to direct table, view, function and procedure retrieval
          try {
            const schemaName = schema.name;
            console.log(
              `[DB2] Falling back to direct retrieval methods for schema ${schemaName}`
            );

            // Get tables
            const tables = await this.getTables(schemaName);
            const validTables = tables.filter(
              (table) => table && table.schemaName && table.pureName
            );
            console.log(
              `[DB2] Found ${tables.length} tables in schema ${schemaName}, ${validTables.length} valid`
            );

            // For each table, try to retrieve columns
            for (const table of validTables) {
              try {
                console.log(
                  `[DB2] Fetching columns for table ${table.schemaName}.${table.pureName}`
                );
                const columns = await this.getColumns(table);

                // If we got columns, add them to the table
                if (columns && columns.length > 0) {
                  table.columns = columns;
                  console.log(
                    `[DB2] Added ${columns.length} columns to table ${table.pureName}`
                  );
                }
              } catch (columnErr) {
                console.error(
                  `[DB2] Error getting columns for table ${table.pureName}: ${columnErr.message}`
                );
              }
            }

            result.tables = result.tables.concat(validTables);

            // Get views
            const views = await this.getViews(schemaName);
            console.log(
              `[DB2] Found ${views.length} views in schema ${schemaName}`
            );
            result.views = result.views.concat(views);

            // Get functions
            const functions = await this.getFunctions(schemaName);
            console.log(
              `[DB2] Found ${functions.length} functions in schema ${schemaName}`
            );
            result.functions = result.functions.concat(functions);
            // Get procedures
            const procedures = await this.getProcedures(schemaName);
            console.log(
              `[DB2] Found ${procedures.length} procedures in schema ${schemaName}`
            );
            result.procedures = result.procedures.concat(procedures);

            // Get triggers
            const triggers = await this.getTriggers(schemaName);
            console.log(
              `[DB2] Found ${triggers.length} triggers in schema ${schemaName}`
            );
            result.triggers = result.triggers.concat(triggers);
          } catch (fallbackErr) {
            console.error(
              `[DB2] Fallback methods also failed for schema ${schema}: ${fallbackErr.message}`
            );
            // Continue with next schema
          }
        }
      }
      console.log('[DB2] Analysis complete. Final counts:');
      console.log(`Tables: ${result.tables.length}`);
      console.log(`Views: ${result.views.length}`);
      console.log(`Functions: ${result.functions.length}`);
      console.log(`Procedures: ${result.procedures.length}`);
      console.log(`Triggers: ${result.triggers.length}`);

      return result;
    } catch (err) {
      console.error(`[DB2] _runAnalysis error: ${err.message}`);
      return {
        schemas: [],
        tables: [],
        views: [],
        functions: [],
        procedures: [],
        triggers: [],
      };
    }
  }
  async getSchemas() {
    try {
      console.log('[DB2] Fetching schemas with timeout protection');

      let currentSchema = null;
      // First try: Get current schema with a simple query
      try {
        const currentRes = await this.driver.query(
          this.connection,
          `
          SELECT CURRENT SCHEMA as "schemaName" FROM SYSIBM.SYSDUMMY1
        `,
          [],
          { timeout: 5000 }
        ); // 5-second timeout for this simple query

        currentSchema =
          currentRes.rows[0]?.schemaName ||
          currentRes.rows[0]?.SCHEMANAME ||
          currentRes.rows[0]?.['CURRENT SCHEMA'];

        console.log(`[DB2] Current schema: ${currentSchema}`);
      } catch (currentErr) {
        console.error(
          `[DB2] Error getting current schema: ${currentErr.message}`
        );
      }

      // Try to get detailed schema info from SYSCAT.SCHEMATA including owners and statistics
      try {
        // Use faster query with no sub-queries for better performance
        const res = await this.driver.query(
          this.connection,
          `
          SELECT 
            SCHEMANAME as "schemaName",
            OWNER as "owner",
            REMARKS as "description",
            CREATE_TIME as "createTime"
          FROM SYSCAT.SCHEMATA
          WHERE SCHEMANAME NOT IN ('SYSIBM', 'SYSTOOLS', 'SYSPROC', 'SYSSTAT', 'SQLJ', 'SYSCAT', 'SYSFUN', 'SYSIBMADM')
          OR SCHEMANAME IN ('NULLID', 'SQLJ')
          ORDER BY SCHEMANAME
          FETCH FIRST 100 ROWS ONLY
        `,
          [],
          { timeout: 10000 }
        ); // 10-second timeout

        if (res.rows && res.rows.length > 0) {
          const schemas = res.rows.map((row) => {
            // Better field access helper
            const getValue = (field) => {
              return (
                row[field] ??
                row[field.toUpperCase()] ??
                row[field.toLowerCase()] ??
                null
              );
            };

            const schemaName = getValue('schemaName');
            return {
              name: schemaName,
              objectType: 'schema',
              owner: getValue('owner') || 'SYSIBM',
              description: getValue('description') || null,
              createTime: getValue('createTime'),
              tableCount: 0, // Skip complex counting queries
              viewCount: 0,
              routineCount: 0,
              isDefault: schemaName === currentSchema,
              id: `schema_${schemaName}`,
              modifyDate: getValue('createTime') || new Date(),
            };
          });
          console.log(
            `[DB2] Found ${schemas.length} schemas from SYSCAT.SCHEMATA (fast query)`
          );
          return schemas;
        }
      } catch (err) {
        console.error(
          `[DB2] Error querying SYSCAT.SCHEMATA with details: ${err.message}`
        );
      } // Fallback: Try basic schema info from SYSCAT.SCHEMATA
      try {
        const res = await this.driver.query(
          this.connection,
          `
          SELECT DISTINCT SCHEMANAME, OWNER
          FROM SYSCAT.SCHEMATA
          WHERE SCHEMANAME NOT IN ('SYSIBM', 'SYSTOOLS', 'SYSPROC', 'SYSSTAT', 'SQLJ', 'SYSCAT', 'SYSFUN', 'SYSIBMADM')
          OR SCHEMANAME IN ('NULLID', 'SQLJ')  
          ORDER BY SCHEMANAME
        `
        );

        if (res.rows && res.rows.length > 0) {
          const schemas = res.rows.map((row) => {
            const schemaName = row.SCHEMANAME || row.schemaName;
            return {
              name: schemaName,
              objectType: 'schema',
              owner: row.OWNER || row.owner || 'SYSIBM',
              description: null,
              tableCount: 0,
              viewCount: 0,
              routineCount: 0,
              isDefault: schemaName === currentSchema,
              id: `schema_${schemaName}`,
              modifyDate: new Date(),
            };
          });
          console.log(
            `[DB2] Found ${schemas.length} schemas from basic SYSCAT.SCHEMATA query`
          );
          return schemas;
        }
      } catch (err) {
        console.error(
          `[DB2] Error querying basic SYSCAT.SCHEMATA: ${err.message}`
        );
      }

      // Last resort: Get from SYSCAT.TABLES
      try {
        const res = await this.driver.query(
          this.connection,
          `
          SELECT DISTINCT TABSCHEMA
          FROM SYSCAT.TABLES
          WHERE TABSCHEMA NOT IN ('SYSIBM', 'SYSTOOLS', 'SYSPROC', 'SYSSTAT', 'SQLJ', 'SYSCAT', 'SYSFUN', 'SYSIBMADM')
          OR TABSCHEMA IN ('NULLID', 'SQLJ')
          ORDER BY TABSCHEMA
        `
        );

        if (res.rows && res.rows.length > 0) {
          const schemas = res.rows.map((row) => {
            const schemaName = row.TABSCHEMA || row.tabschema;
            return {
              name: schemaName,
              objectType: 'schema',
              owner: 'SYSIBM',
              description: null,
              tableCount: 1, // At least one table exists since we queried from TABLES
              viewCount: 0,
              routineCount: 0,
              isDefault: schemaName === currentSchema,
              id: `schema_${schemaName}`,
              modifyDate: new Date(),
            };
          });
          console.log(
            `[DB2] Found ${schemas.length} schemas from SYSCAT.TABLES`
          );
          return schemas;
        }
      } catch (err) {
        console.error(`[DB2] Error querying SYSCAT.TABLES: ${err.message}`);
      } // If all else fails, return SQLJ as default schema object
      console.log('[DB2] Using default schema SQLJ');
      return [
        {
          name: 'SQLJ',
          pureName: 'SQLJ',
          schemaName: 'SQLJ',
          objectSchema: 'SQLJ',
          fullName: 'SQLJ',
          objectType: 'schema',
          owner: 'SYSIBM',
          description: null,
          tableCount: 0,
          viewCount: 0,
          routineCount: 0,
          isDefault: true,
          id: 'schema_SQLJ',
          modifyDate: new Date(),
        },
      ];
    } catch (err) {
      console.error(`[DB2] Schema retrieval failed: ${err.message}`); // Return default schema as an object with all required properties
      return [
        {
          name: 'SQLJ',
          pureName: 'SQLJ',
          schemaName: 'SQLJ',
          objectSchema: 'SQLJ',
          fullName: 'SQLJ',
          objectType: 'schema',
          owner: 'SYSIBM',
          description: null,
          tableCount: 0,
          viewCount: 0,
          routineCount: 0,
          isDefault: true,
          id: 'schema_SQLJ',
          modifyDate: new Date(),
        },
      ];
    }
  }
  async getTables(schemaName) {
    try {
      console.log(`[DB2] Getting tables for schema: ${schemaName}`);

      if (!schemaName) {
        console.warn(
          '[DB2] No schema name provided for getTables, attempting to use current schema'
        );
        try {
          const currentSchemaResult = await this.driver.query(
            this.connection,
            `
            SELECT CURRENT SCHEMA as schemaName FROM SYSIBM.SYSDUMMY1
          `
          );

          if (currentSchemaResult?.rows?.length > 0) {
            schemaName =
              currentSchemaResult.rows[0]?.SCHEMANAME ||
              currentSchemaResult.rows[0]?.schemaName ||
              currentSchemaResult.rows[0]?.['CURRENT SCHEMA'];

            console.log(
              `[DB2] Using current schema for getTables: ${schemaName}`
            );
          }
        } catch (err) {
          console.error(
            '[DB2] Error determining current schema for getTables:',
            err
          );
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
      console.log(
        `[DB2] Raw table query results:`,
        JSON.stringify(res.rows?.slice(0, 2) || [], null, 2)
      ); // Log only first 2 rows to avoid excessive logging

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

        const noTypeRes = await this.driver.query(
          this.connection,
          noTypeQuery,
          [schemaName]
        );
        console.log(
          `[DB2] Raw no-type filter results:`,
          JSON.stringify(noTypeRes.rows, null, 2)
        );

        if (noTypeRes.rows && noTypeRes.rows.length > 0) {
          res.rows = noTypeRes.rows;
        }
      }

      // If still no results, try SYSIBM.SYSTABLES
      if (!res.rows || res.rows.length === 0) {
        console.log(
          `[DB2] No results from SYSCAT.TABLES, trying SYSIBM.SYSTABLES`
        );
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

        const fallbackRes = await this.driver.query(
          this.connection,
          fallbackQuery,
          [schemaName]
        );
        console.log(
          `[DB2] Raw SYSIBM.SYSTABLES results:`,
          JSON.stringify(fallbackRes.rows, null, 2)
        );

        if (fallbackRes.rows && fallbackRes.rows.length > 0) {
          res.rows = fallbackRes.rows;
        }
      }

      // If still no results, try to get tables from columns
      if (!res.rows || res.rows.length === 0) {
        console.log(
          `[DB2] No results from catalog views, checking SYSCAT.COLUMNS`
        );
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

        const columnsRes = await this.driver.query(
          this.connection,
          columnsQuery,
          [schemaName]
        );
        console.log(
          `[DB2] Raw SYSCAT.COLUMNS results:`,
          JSON.stringify(columnsRes.rows, null, 2)
        );

        if (columnsRes.rows && columnsRes.rows.length > 0) {
          res.rows = columnsRes.rows.map((row) => ({
            ...row,
            tableType: 'T',
            description: null,
            createTime: null,
            alterTime: null,
          }));
        }
      }

      // If still no results, try to get any tables the user has access to
      if (!res.rows || res.rows.length === 0) {
        console.log(
          `[DB2] No results from any catalog views, trying to list all accessible tables`
        );
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

        const allTablesRes = await this.driver.query(
          this.connection,
          allTablesQuery
        );
        console.log(
          `[DB2] Raw all tables results:`,
          JSON.stringify(allTablesRes.rows, null, 2)
        );

        if (allTablesRes.rows && allTablesRes.rows.length > 0) {
          res.rows = allTablesRes.rows;
        }
      }

      console.log(
        `[DB2] Found ${res.rows?.length || 0} tables in schema ${schemaName}`
      );

      return (res.rows || []).map((row) => {
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
          contentHash:
            row.alterTime?.toISOString() ||
            row.createTime?.toISOString() ||
            `${row.schemaName}.${row.tableName}`,
          modifyDate: row.alterTime || row.createTime,
          isView: false,
          isTable: true,
          displayName: row.tableName,
        };
        console.log(`[DB2] Mapped table object:`, table);
        return table;
      });
    } catch (err) {
      console.error(`[DB2] Error getting tables: ${err.message}`);
      return [];
    }
  }
  // async incrementalAnalysis(structure) {
  //   console.log('[DB2] Starting incremental analysis');

  //   try {
  //     // Get all schemas
  //     const schemas = await this.getSchemas();
  //     if (!schemas || schemas.length === 0) {
  //       console.error('[DB2] No schemas found, analysis cannot continue');
  //       return {
  //         schemas: [],
  //         tables: [],
  //         views: [],
  //         functions: [],
  //         procedures: [],
  //         triggers: [],
  //       };
  //     }
  //     console.log(`[DB2] Found schemas: ${JSON.stringify(schemas)}`);

  //     const result = {
  //       schemas: schemas,
  //       tables: [],
  //       views: [],
  //       functions: [],
  //       procedures: [],
  //       triggers: [],
  //     };

  //     // Use the getStructure method to get database objects for each schema
  //     for (const schema of schemas) {
  //       console.log(`[DB2] Analyzing schema: ${schema.name}`);

  //       try {
  //         // Use the driver's getStructure method which is already well-implemented
  //         const structureData = await this.driver.getStructure(
  //           this.connection,
  //           schema.name
  //         );

  //         // Validate structureData to prevent null reference errors
  //         if (!structureData) {
  //           console.error(
  //             `[DB2] No structure data returned for schema ${schema.name}`
  //           );
  //           continue;
  //         }

  //         // Ensure each property exists to avoid 'length' of undefined errors
  //         structureData.tables = structureData.tables || [];
  //         structureData.views = structureData.views || [];
  //         structureData.functions = structureData.functions || [];
  //         structureData.procedures = structureData.procedures || [];

  //         console.log(`[DB2] Got structure data for schema ${schema.name}:`, {
  //           tables: structureData.tables.length,
  //           views: structureData.views.length,
  //           functions: structureData.functions.length,
  //           procedures: structureData.procedures.length,
  //         });

  //         // Mapping tables from getStructure format to incrementalAnalysis format
  //         const tables = structureData.tables.map((table) => ({
  //           pureName: table.pureName,
  //           schemaName: table.schemaName,
  //           objectType: 'table',
  //           objectId: `${table.schemaName}.${table.pureName}`,
  //           tableType: table.tableType || 'T',
  //           createTime: table.createTime,
  //           alterTime: table.alterTime,
  //           description: table.description,
  //           contentHash: table.contentHash,
  //           modifyDate: table.alterTime || table.createTime,
  //           isView: false,
  //           isTable: true,
  //           displayName: table.pureName,
  //         }));
  //         result.tables = result.tables.concat(tables);

  //         // Mapping views
  //         const views = structureData.views.map((view) => ({
  //           pureName: view.pureName,
  //           schemaName: view.schemaName,
  //           objectType: 'view',
  //           objectId: `${view.schemaName}.${view.pureName}`,
  //           description: view.description,
  //           createTime: view.createTime,
  //           alterTime: view.alterTime,
  //           definition: view.definition,
  //           contentHash: view.contentHash,
  //           isView: true,
  //           isTable: false,
  //           displayName: view.pureName,
  //         }));
  //         result.views = result.views.concat(views);

  //         // Mapping functions
  //         const functions = structureData.functions.map((func) => ({
  //           pureName: func.pureName,
  //           schemaName: func.schemaName,
  //           objectType: 'function',
  //           objectId: `${func.schemaName}.${func.pureName}`,
  //           description: func.description,
  //           createTime: func.createTime,
  //           alterTime: func.alterTime,
  //           definition: func.definition,
  //           contentHash: func.contentHash,
  //           displayName: func.pureName,
  //         }));
  //         result.functions = result.functions.concat(functions);

  //         // Mapping procedures
  //         const procedures = structureData.procedures.map((proc) => ({
  //           pureName: proc.pureName,
  //           schemaName: proc.schemaName,
  //           objectType: 'procedure',
  //           objectId: `${proc.schemaName}.${proc.pureName}`,
  //           description: proc.description,
  //           createTime: proc.createTime,
  //           alterTime: proc.alterTime,
  //           definition: proc.definition,
  //           contentHash: proc.contentHash,
  //           displayName: proc.pureName,
  //         }));
  //         result.procedures = result.procedures.concat(procedures);
  //       } catch (schemaErr) {
  //         console.error(
  //           `[DB2] Error analyzing schema ${schema}: ${schemaErr.message}`
  //         );
  //         console.error(schemaErr);

  //         // Fallback to original methods if getStructure fails
  //         try {
  //           console.log(
  //             `[DB2] Falling back to original methods for schema ${schema}`
  //           );

  //           // Get tables
  //           const tables = await this.getTables(schema);
  //           // Filter out invalid tables with missing schema or table names
  //           const validTables = tables.filter(
  //             (table) => table.schemaName && table.pureName
  //           );
  //           console.log(
  //             `[DB2] Found ${tables.length} tables in schema ${schema}, ${validTables.length} valid`
  //           );
  //           result.tables = result.tables.concat(validTables);

  //           // Get views
  //           const views = await this.getViews(schema);
  //           console.log(
  //             `[DB2] Found ${views.length} views in schema ${schema}`
  //           );
  //           result.views = result.views.concat(views);

  //           // Get functions
  //           const functions = await this.getFunctions(schema);
  //           console.log(
  //             `[DB2] Found ${functions.length} functions in schema ${schema}`
  //           );
  //           result.functions = result.functions.concat(functions);

  //           // Get procedures
  //           const procedures = await this.getProcedures(schema);
  //           console.log(
  //             `[DB2] Found ${procedures.length} procedures in schema ${schema}`
  //           );
  //           result.procedures = result.procedures.concat(procedures);
  //         } catch (fallbackErr) {
  //           console.error(
  //             `[DB2] Fallback methods also failed for schema ${schema}: ${fallbackErr.message}`
  //           );
  //           // Continue with next schema
  //         }
  //       }
  //     }

  //     // Debug output
  //     console.log('[DB2] Analysis complete. Final counts:');
  //     console.log(`Schemas (${result.schemas.length}):`, result.schemas);
  //     console.log(
  //       `Tables (${result.tables.length}):`,
  //       result.tables.map((t) => `${t.schemaName}.${t.pureName}`).slice(0, 5)
  //     ); // Limit output to first 5
  //     console.log(
  //       `Views (${result.views.length}):`,
  //       result.views.map((v) => `${v.schemaName}.${v.pureName}`).slice(0, 5)
  //     );
  //     console.log(
  //       `Functions (${result.functions.length}):`,
  //       result.functions.map((f) => `${f.schemaName}.${f.pureName}`).slice(0, 5)
  //     );
  //     console.log(
  //       `Procedures (${result.procedures.length}):`,
  //       result.procedures
  //         .map((p) => `${p.schemaName}.${p.pureName}`)
  //         .slice(0, 5)
  //     );

  //     return result;
  //   } catch (err) {
  //     console.error(`[DB2] Analysis error: ${err.message}`);
  //     // Create a basic structure if analysis fails
  //     console.log('[DB2] Creating fallback structure for UI');
  //     // Try to get at least the current schema
  //     let schemaName = this.connection.database || this.connection.user || '';
  //     try {
  //       const schemaResult = await this.query(
  //         this.connection,
  //         `SELECT CURRENT SCHEMA as schemaName FROM SYSIBM.SYSDUMMY1`
  //       );
  //       if (schemaResult?.rows?.length > 0) {
  //         schemaName =
  //           schemaResult.rows[0].SCHEMANAME ||
  //           schemaResult.rows[0].schemaName ||
  //           this.connection.database ||
  //           this.connection.user ||
  //           '';
  //       }
  //     } catch (schemaErr) {
  //       console.error(`[DB2] Error getting schema: ${schemaErr.message}`);
  //     }

  //     return {
  //       objectTypeField: 'objectType',
  //       objectIdField: 'objectId',
  //       schemaField: 'schemaName',
  //       pureNameField: 'pureName',
  //       contentHashField: 'contentHash',
  //       schemas: [
  //         {
  //           schemaName,
  //           objectType: 'schema',
  //           pureName: schemaName,
  //           objectId: schemaName,
  //           contentHash: schemaName,
  //         },
  //       ],
  //       tables: [],
  //       views: [],
  //       functions: [],
  //       procedures: [],
  //     };
  //   }
  // }
  async getColumns(table) {
    try {
      console.log(
        `[DB2] Getting columns for ${table.schemaName}.${
          table.tableName || table.pureName
        }`
      );

      // First try SYSCAT.COLUMNS (LUW DB2)
      try {
        const res = await this.driver.query(
          this.connection,
          `
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
        `,
          [table.schemaName, table.tableName || table.pureName]
        );

        console.log(
          `[DB2] Found ${res.rows?.length || 0} columns using SYSCAT.COLUMNS`
        );

        // Process the rows to normalize case sensitivity and ensure unique identifiers
        return (res.rows || []).map((row, index) => {
          const normalizedRow = {};
          // Get column name with fallbacks to handle different casing
          const colName =
            row.COLNAME || row.colname || row.columnName || `column_${index}`;

          for (const key in row) {
            normalizedRow[key] = row[key];
            normalizedRow[key.toLowerCase()] = row[key];

            // Map specific fields
            if (key.toUpperCase() === 'COLNAME')
              normalizedRow.columnName = row[key];
            if (key.toUpperCase() === 'TYPENAME')
              normalizedRow.dataType = row[key];
          }

          // Ensure the columnName property exists
          if (!normalizedRow.columnName) normalizedRow.columnName = colName;

          // Generate a truly unique ID for each column by including table info and index
          normalizedRow.uniqueName = `${table.schemaName}.${
            table.tableName || table.pureName
          }.${colName}_${index}`;

          return normalizedRow;
        });
      } catch (err) {
        console.error(`[DB2] SYSCAT.COLUMNS error: ${err.message}`);

        // Try SYSIBM.SYSCOLUMNS (z/OS)
        try {
          console.log('[DB2] Trying SYSIBM.SYSCOLUMNS...');
          const res = await this.driver.query(
            this.connection,
            `
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
          `,
            [table.schemaName, table.tableName || table.pureName]
          );

          console.log(
            `[DB2] Found ${
              res.rows?.length || 0
            } columns using SYSIBM.SYSCOLUMNS`
          );

          // Process the rows to normalize case sensitivity and ensure unique identifiers
          return (res.rows || []).map((row, index) => {
            const normalizedRow = {};
            // Get column name with fallbacks
            const colName =
              row.NAME || row.name || row.columnName || `column_${index}`;

            for (const key in row) {
              normalizedRow[key] = row[key];
              normalizedRow[key.toLowerCase()] = row[key];

              // Map specific fields
              if (key.toUpperCase() === 'NAME')
                normalizedRow.columnName = row[key];
              if (key.toUpperCase() === 'COLTYPE')
                normalizedRow.dataType = row[key];
            }

            // Ensure the columnName property exists
            if (!normalizedRow.columnName) normalizedRow.columnName = colName;

            // Generate a truly unique ID for each column by including table info and index
            normalizedRow.uniqueName = `${table.schemaName}.${
              table.tableName || table.pureName
            }.${colName}_${index}`;

            return normalizedRow;
          });
        } catch (fallbackErr) {
          console.error(
            `[DB2] SYSIBM.SYSCOLUMNS error: ${fallbackErr.message}`
          );

          // Last resort - try using INFORMATION_SCHEMA
          try {
            console.log('[DB2] Trying INFORMATION_SCHEMA.COLUMNS...');
            const res = await this.driver.query(
              this.connection,
              `
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
              `,
              [table.schemaName, table.tableName || table.pureName]
            );

            console.log(
              `[DB2] Found ${
                res.rows?.length || 0
              } columns using INFORMATION_SCHEMA.COLUMNS`
            );

            // Process the results to ensure unique identifiers
            return (res.rows || []).map((row, index) => {
              // Ensure we have a uniqueName for each column
              const colName =
                row.COLUMN_NAME || row.columnName || `column_${index}`;
              return {
                ...row,
                columnName: colName,
                uniqueName: `${table.schemaName}.${
                  table.tableName || table.pureName
                }.${colName}_${index}`,
              };
            });
          } catch (lastResortErr) {
            console.error(
              `[DB2] INFORMATION_SCHEMA.COLUMNS error: ${lastResortErr.message}`
            );
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
      console.log(
        `[DB2] Getting primary keys for ${table.schemaName}.${table.tableName}`
      );

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
        table.tableName,
      ]);
      console.log(`[DB2] Found ${res.rows.length} primary key columns`);

      return res.rows.map((row) => ({
        ...row,
        schemaName: table.schemaName,
        tableName: table.tableName,
        constraintType: 'PRIMARY KEY',
      }));
    } catch (err) {
      console.error(`[DB2] Error getting primary keys: ${err.message}`);
      return [];
    }
  }

  async getForeignKeys(table) {
    try {
      console.log(
        `[DB2] Getting foreign keys for ${table.schemaName}.${table.tableName}`
      );

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

      const res = await this.driver.query(this.connection, query, [
        table.schemaName,
        table.tableName,
      ]);
      console.log(`[DB2] Found ${res.rows.length} foreign keys`);

      return res.rows.map((row) => ({
        ...row,
        schemaName: table.schemaName,
        tableName: table.tableName,
        constraintType: 'FOREIGN KEY',
        onDelete: row.deleteRule,
        onUpdate: row.updateRule,
      }));
    } catch (err) {
      console.error(`[DB2] Error getting foreign keys: ${err.message}`);
      return [];
    }
  }

  async getIndexes(table) {
    try {
      console.log(
        `[DB2] Getting indexes for ${table.schemaName}.${table.tableName}`
      );

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

      const res = await this.driver.query(this.connection, query, [
        table.schemaName,
        table.tableName,
      ]);
      console.log(`[DB2] Found ${res.rows.length} indexes`);

      return res.rows.map((row) => ({
        ...row,
        schemaName: table.schemaName,
        tableName: table.tableName,
        isUnique: row.isUnique === 'U',
        isPrimary: row.isUnique === 'P',
        isClustered: row.indexType === 'CLUSTER',
      }));
    } catch (err) {
      console.error(`[DB2] Error getting indexes: ${err.message}`);
      return [];
    }
  }

  async getViews(schemaName) {
    try {
      console.log(
        `[DB2] Getting views for schema: ${schemaName || 'current schema'}`
      );

      // If schemaName is not provided, get the current schema
      let effectiveSchema = schemaName;
      if (!effectiveSchema) {
        try {
          const currentSchema = await this.driver.query(
            this.connection,
            `
            SELECT CURRENT SCHEMA as schemaName FROM SYSIBM.SYSDUMMY1
          `
          );
          effectiveSchema =
            currentSchema.rows[0]?.SCHEMANAME ||
            currentSchema.rows[0]?.schemaName ||
            '';
        } catch (schemaErr) {
          console.error(
            `[DB2] Error getting current schema: ${schemaErr.message}`
          );
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
      const res = await this.driver.query(this.connection, query, [
        effectiveSchema,
      ]);
      console.log(`[DB2] Found ${res.rows.length} views`);

      return res.rows.map((row) => ({
        ...row,
        objectType: 'view',
        objectId: `${row.schemaName}.${row.viewName}`,
        pureName: row.viewName,
        schemaName: row.schemaName,
        displayName: row.viewName,
        contentHash:
          row.definition ||
          row.alterTime?.toISOString() ||
          row.createTime?.toISOString(),
        name: `${row.schemaName}.${row.viewName}`,
      }));
    } catch (err) {
      console.error(`[DB2] Error getting views: ${err.message}`);
      return [];
    }
  }

  async getProcedures(schemaName) {
    try {
      console.log(
        `[DB2] Getting procedures for schema: ${schemaName || 'current schema'}`
      );

      // If schemaName is not provided, get the current schema
      let effectiveSchema = schemaName;
      if (!effectiveSchema) {
        try {
          const currentSchema = await this.driver.query(
            this.connection,
            `
            SELECT CURRENT SCHEMA as schemaName FROM SYSIBM.SYSDUMMY1
          `
          );
          effectiveSchema =
            currentSchema.rows[0]?.SCHEMANAME ||
            currentSchema.rows[0]?.schemaName ||
            '';
        } catch (schemaErr) {
          console.error(
            `[DB2] Error getting current schema: ${schemaErr.message}`
          );
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

      console.log(
        `[DB2] Executing procedure query for schema: ${effectiveSchema}`
      );
      const res = await this.driver.query(this.connection, query, [
        effectiveSchema,
      ]);
      console.log(`[DB2] Found ${res.rows.length} procedures`);

      return res.rows.map((row) => ({
        ...row,
        objectType: 'procedure',
        objectId: `${row.schemaName}.${row.procedureName}`,
        pureName: row.procedureName,
        schemaName: row.schemaName,
        displayName: row.procedureName,
        contentHash:
          row.definition ||
          row.alterTime?.toISOString() ||
          row.createTime?.toISOString(),
        name: `${row.schemaName}.${row.procedureName}`,
      }));
    } catch (err) {
      console.error(`[DB2] Error getting procedures: ${err.message}`);
      return [];
    }
  }

  async getFunctions(schemaName) {
    try {
      console.log(
        `[DB2] Getting functions for schema: ${schemaName || 'current schema'}`
      );

      // If schemaName is not provided, get the current schema
      let effectiveSchema = schemaName;
      if (!effectiveSchema) {
        try {
          const currentSchema = await this.driver.query(
            this.connection,
            `
            SELECT CURRENT SCHEMA as schemaName FROM SYSIBM.SYSDUMMY1
          `
          );
          effectiveSchema =
            currentSchema.rows[0]?.SCHEMANAME ||
            currentSchema.rows[0]?.schemaName ||
            '';
        } catch (schemaErr) {
          console.error(
            `[DB2] Error getting current schema: ${schemaErr.message}`
          );
          effectiveSchema = '';
        }
      }

      // Get functions
      let functions = [];
      try {
        // First try with RETURN_TYPE
        try {
          console.log(`[DB2] Trying to get functions with RETURN_TYPE column`);
          const functionsRes = await this.driver.query(
            this.connection,
            `
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
          `,
            [effectiveSchema]
          );

          functions = functionsRes.rows.map((row) => ({
            schemaName: row.SCHEMANAME || row.schemaName,
            pureName: row.FUNCTIONNAME || row.functionName,
            objectType: 'function',
            objectId: `${row.SCHEMANAME || row.schemaName}.${
              row.FUNCTIONNAME || row.functionName
            }`,
            description: row.REMARKS || row.description,
            definition: row.TEXT || row.definition,
            parameterStyle: row.PARAMETERSTYLE || row.parameterStyle,
            language: row.LANGUAGE || row.language,
            returnType: row.RETURN_TYPE || row.returnType || 'unknown',
            createTime: row.CREATETIME || row.createTime,
            alterTime: row.ALTERTIME || row.alterTime,
            contentHash:
              row.TEXT ||
              row.ALTERTIME?.toISOString() ||
              row.CREATETIME?.toISOString(),
            displayName: row.FUNCTIONNAME || row.functionName,
          }));
          console.log(
            `[DB2] Successfully retrieved ${functions.length} functions using RETURN_TYPE`
          );
        } catch (err) {
          console.error('[DB2] Error getting functions with RETURN_TYPE:', err);

          // Try second approach without the RETURN_TYPE column
          try {
            console.log(
              `[DB2] Trying to get functions without RETURN_TYPE column`
            );
            const functionsRes2 = await this.driver.query(
              this.connection,
              `
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
            `,
              [effectiveSchema]
            );

            functions = functionsRes2.rows.map((row) => ({
              schemaName: row.SCHEMANAME || row.schemaName,
              pureName: row.FUNCTIONNAME || row.functionName,
              objectType: 'function',
              objectId: `${row.SCHEMANAME || row.schemaName}.${
                row.FUNCTIONNAME || row.functionName
              }`,
              description: row.REMARKS || row.description,
              definition: row.TEXT || row.definition,
              parameterStyle: row.PARAMETERSTYLE || row.parameterStyle,
              language: row.LANGUAGE || row.language,
              returnType: 'unknown', // Since we couldn't get the return type
              createTime: row.CREATETIME || row.createTime,
              alterTime: row.ALTERTIME || row.alterTime,
              contentHash:
                row.TEXT ||
                row.ALTERTIME?.toISOString() ||
                row.CREATETIME?.toISOString(),
              displayName: row.FUNCTIONNAME || row.functionName,
            }));
            console.log(
              `[DB2] Successfully retrieved ${functions.length} functions without RETURN_TYPE column`
            );
          } catch (err2) {
            console.error(
              '[DB2] Error getting functions without RETURN_TYPE column:',
              err2
            );

            // Try third approach with minimal columns
            try {
              console.log(`[DB2] Trying to get functions with minimal columns`);
              const functionsRes3 = await this.driver.query(
                this.connection,
                `
                SELECT 
                  ROUTINESCHEMA as schemaName,
                  ROUTINENAME as functionName,
                  LANGUAGE as language
                FROM SYSCAT.ROUTINES 
                WHERE ROUTINETYPE = 'F'
                AND ROUTINESCHEMA = ?
                ORDER BY ROUTINENAME
              `,
                [effectiveSchema]
              );

              functions = functionsRes3.rows.map((row) => ({
                schemaName: row.SCHEMANAME || row.schemaName,
                pureName: row.FUNCTIONNAME || row.functionName,
                objectType: 'function',
                objectId: `${row.SCHEMANAME || row.schemaName}.${
                  row.FUNCTIONNAME || row.functionName
                }`,
                language: row.LANGUAGE || row.language,
                returnType: 'unknown',
                contentHash: `${row.SCHEMANAME || row.schemaName}.${
                  row.FUNCTIONNAME || row.functionName
                }`,
                displayName: row.FUNCTIONNAME || row.functionName,
              }));
              console.log(
                `[DB2] Successfully retrieved ${functions.length} functions with minimal columns`
              );
            } catch (err3) {
              console.error(
                '[DB2] Error getting functions with minimal columns:',
                err3
              );
              // We'll return an empty array if all approaches fail
            }
          }
        }
      } catch (tryErr) {
        console.error('[DB2] Error in functions try block:', tryErr);
      }

      return functions;
    } catch (err) {
      console.error(`[DB2] Error getting functions: ${err.message}`);
      return [];
    }
  }

  async getUniqueConstraints(table) {
    try {
      console.log(
        `[DB2] Getting unique constraints for ${table.schemaName}.${table.tableName}`
      );

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

      const res = await this.driver.query(this.connection, query, [
        table.schemaName,
        table.tableName,
      ]);
      console.log(`[DB2] Found ${res.rows.length} unique constraints`);

      return res.rows.map((row) => ({
        ...row,
        schemaName: table.schemaName,
        tableName: table.tableName,
        constraintType: 'UNIQUE',
      }));
    } catch (err) {
      console.error(`[DB2] Error getting unique constraints: ${err.message}`);
      return [];
    }
  }
  async getTriggers(schemaName) {
    try {
      console.log(
        `[DB2] Getting triggers for schema: ${schemaName || 'current schema'}`
      );

      // If schemaName is not provided, get the current schema
      let effectiveSchema = schemaName;
      if (!effectiveSchema) {
        try {
          const currentSchema = await this.driver.query(
            this.connection,
            `
            SELECT CURRENT SCHEMA as schemaName FROM SYSIBM.SYSDUMMY1
          `
          );
          effectiveSchema =
            currentSchema.rows[0]?.SCHEMANAME ||
            currentSchema.rows[0]?.schemaName ||
            currentSchema.rows[0]?.['CURRENT SCHEMA'] ||
            '';
        } catch (schemaErr) {
          console.error(
            `[DB2] Error getting current schema: ${schemaErr.message}`
          );
          effectiveSchema = '';
        }
      }

      // Try to retrieve triggers with multiple fallback approaches
      let triggers = [];

      // First approach: Use SYSCAT.TRIGGERS
      try {
        console.log(`[DB2] Trying to get triggers from SYSCAT.TRIGGERS`);
        const triggersQuery = `
          SELECT 
            TABSCHEMA as schemaName,
            TABNAME as tableName,
            TRIGNAME as triggerName,
            REMARKS as description,
            TEXT as definition,
            CREATE_TIME as createTime,
            TRIGTIME as triggerTime,
            TRIGEVENT as triggerEvent,
            ENABLED as enabled,
            TRIGACTION as triggerAction,
            GRANULARITY as granularity
          FROM SYSCAT.TRIGGERS
          WHERE TABSCHEMA = ?
          ORDER BY TRIGNAME
        `;

        const triggersRes = await this.driver.query(
          this.connection,
          triggersQuery,
          [effectiveSchema]
        );

        if (triggersRes.rows && triggersRes.rows.length > 0) {
          triggers = triggersRes.rows.map((row) => {
            const triggerName = (row.TRIGNAME || row.triggerName || '').trim();
            const triggerEvent = row.TRIGEVENT || row.triggerEvent;
            const triggerTime = row.TRIGTIME || row.triggerTime;

            // Format trigger information for easier reading in UI
            let formattedEvent = '';
            if (triggerEvent) {
              if (triggerEvent.includes('I')) formattedEvent += 'INSERT';
              if (triggerEvent.includes('U'))
                formattedEvent += formattedEvent ? ', UPDATE' : 'UPDATE';
              if (triggerEvent.includes('D'))
                formattedEvent += formattedEvent ? ', DELETE' : 'DELETE';
            }

            let formattedTime = '';
            if (triggerTime) {
              if (triggerTime === 'A') formattedTime = 'AFTER';
              else if (triggerTime === 'B') formattedTime = 'BEFORE';
              else if (triggerTime === 'I') formattedTime = 'INSTEAD OF';
              else formattedTime = triggerTime;
            }

            return {
              schemaName: (row.TABSCHEMA || row.schemaName || '').trim(),
              pureName: triggerName,
              tableName: (row.TABNAME || row.tableName || '').trim(),
              objectType: 'trigger',
              objectId: `${(
                row.TABSCHEMA ||
                row.schemaName ||
                ''
              ).trim()}.${triggerName}`,
              description: row.REMARKS || row.description,
              definition: row.TEXT || row.definition,
              createTime: row.CREATE_TIME || row.createTime,
              triggerTime: triggerTime,
              triggerEvent: triggerEvent,
              triggerAction: row.TRIGACTION || row.triggerAction,
              granularity: row.GRANULARITY || row.granularity,
              formattedEvent: formattedEvent || triggerEvent,
              formattedTime: formattedTime,
              enabled: row.ENABLED === 'Y',
              contentHash: row.TEXT || row.CREATE_TIME?.toISOString(),
              modifyDate: row.CREATE_TIME || new Date(),
              displayName: triggerName,
            };
          });
        }

        console.log(
          `[DB2] Successfully retrieved ${triggers.length} triggers from SYSCAT.TRIGGERS`
        );
      } catch (err) {
        console.error(
          `[DB2] Error getting triggers from SYSCAT.TRIGGERS: ${err.message}`
        );

        // Second approach: Use SYSIBM.SYSTRIGGERS if SYSCAT.TRIGGERS failed
        try {
          console.log(`[DB2] Trying to get triggers from SYSIBM.SYSTRIGGERS`);
          const triggersQuery2 = `
            SELECT 
              SCHEMA as schemaName,
              TBNAME as tableName,
              NAME as triggerName,
              REMARKS as description,
              TEXT as definition,
              CREATED as createTime,
              TRIGTIME as triggerTime,
              TRIGEVENT as triggerEvent,
              ENABLED as enabled
            FROM SYSIBM.SYSTRIGGERS
            WHERE SCHEMA = ?
            ORDER BY NAME
          `;

          const triggersRes2 = await this.driver.query(
            this.connection,
            triggersQuery2,
            [effectiveSchema]
          );

          if (triggersRes2.rows && triggersRes2.rows.length > 0) {
            triggers = triggersRes2.rows.map((row) => {
              const triggerName = (row.NAME || row.triggerName || '').trim();
              return {
                schemaName: (row.SCHEMA || row.schemaName || '').trim(),
                pureName: triggerName,
                tableName: (row.TBNAME || row.tableName || '').trim(),
                objectType: 'trigger',
                objectId: `${(
                  row.SCHEMA ||
                  row.schemaName ||
                  ''
                ).trim()}.${triggerName}`,
                description: row.REMARKS || row.description,
                definition: row.TEXT || row.definition,
                createTime: row.CREATED || row.createTime,
                triggerTime: row.TRIGTIME || row.triggerTime,
                triggerEvent: row.TRIGEVENT || row.triggerEvent,
                enabled: row.ENABLED === 'Y',
                contentHash: row.TEXT || row.CREATED?.toISOString(),
                modifyDate: row.CREATED || new Date(),
                displayName: triggerName,
              };
            });
          }

          console.log(
            `[DB2] Successfully retrieved ${triggers.length} triggers from SYSIBM.SYSTRIGGERS`
          );
        } catch (err2) {
          console.error(
            `[DB2] Error getting triggers from SYSIBM.SYSTRIGGERS: ${err2.message}`
          );
          // Will return empty array if both approaches fail
        }
      }

      return triggers;
    } catch (err) {
      console.error(`[DB2] Error in getTriggers: ${err.message}`);
      return [];
    }
  }
}

module.exports = Analyser;
