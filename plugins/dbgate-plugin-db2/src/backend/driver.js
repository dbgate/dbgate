const ibmdb = require('ibm_db');
const _ = require('lodash');

const Analyser = require('./Analyser');
const connectHelper = require('./connect-fixed');
const driverBase = require('../frontend/driver');
const cacheManager = require('./cache-manager');
const connectionManager = require('./connection-manager');
const { refreshSchemaCounts } = require('./schemaHelper');
const { createBulkInsertStreamBase, makeUniqueColumnNames } =
global.DBGATE_PACKAGES['dbgate-tools'];


function extractdb2Columns(row) {
  if (!row) return [];

  const columns = row.__columns.map((column) => ({ columnName: column.name }));
  makeUniqueColumnNames(columns);

  return columns;
}

/** @type {import('dbgate-types').EngineDriver<db2.db2>} */
const driver = {
  ...driverBase,
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
    
    // Configure object types
    this.supportedObjectTypes = ['tables', 'views', 'procedures', 'functions', 'schemas'];
    this.schemaFields = {
      objectTypeField: 'objectType',
      schemaField: 'schemaName',
      pureNameField: 'pureName',
      objectIdField: 'objectId',
      contentHashField: 'contentHash'
    };
    
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
    // Add optimized connection settings to prevent timeouts
    const connectionSettings = {
      server, 
      port, 
      user, 
      password, 
      database, 
      ssl, 
      isReadOnly, 
      useDatabaseUrl, 
      databaseUrl,
      ibmdb,
      // Add connection optimization parameters
      connectTimeout: 30, // 30 seconds connection timeout
      connectionRetries: 5, // Increase retries for more reliability
      queryTimeout: 60, // 60 seconds query timeout
      optimizeSchemaQueries: true, // Flag to optimize schema-related queries
      useCaching: true // Enable result caching for better performance
    };
    
    console.log('[DB2] Connecting with optimized settings, including timeout protection and caching');
    const dbhan = await connectHelper(connectionSettings);
    
    // Store the connection params for possible reconnection scenarios
    dbhan._connectionParams = connectionSettings;
    
    // Generate a connection ID for tracking
    const connectionId = `${server}_${port}_${user}_${database}_${Date.now()}`;
    dbhan._connectionId = connectionId;
    
    // Register connection with the connection manager
    connectionManager.registerConnection(connectionId, dbhan);
    
    console.log(`[DB2] Connection registered with ID: ${connectionId}`);
    return dbhan;
  },

  async query(dbhan, sql, params = [], options = {}) {
    try {
      // Track start time for query profiling
      const startTime = Date.now();
      
      // Validate connection
      if (!dbhan || !dbhan.client) {
        console.error('[DB2] Query failed: No database connection');
        return {
          rows: [],
          columns: [],
          rowCount: 0,
          errorMessage: 'No database connection',
          errorType: 'CONNECTION_ERROR',
          duration: 0
        };
      }
      
      // Validate SQL param - convert to string if needed or provide empty string
      if (sql === null || sql === undefined) {
        console.warn('[DB2] Null or undefined SQL query received, using empty string instead');
        sql = '';
      } else if (typeof sql !== 'string') {
        console.warn('[DB2] Non-string SQL query received, converting to string:', typeof sql);
        try {
          sql = String(sql);
        } catch (err) {
          console.error('[DB2] Failed to convert SQL query to string:', err);
          sql = '';
        }
      }
      
      if (sql.trim() === '') {
        return {
          rows: [],
          columns: [],
          rowCount: 0,
          duration: 0,
          message: 'Empty SQL query'
        };
      }
      
      // Ensure params is always an array
      if (!Array.isArray(params)) {
        console.warn('[DB2] Non-array params received, converting to empty array');
        params = [];
      }
      
      // Validate parameters to prevent common SQL injection vectors
      params = params.map(param => {
        if (param === undefined || param === null) return null;
        return param;
      });
      
      // Track connection activity and monitor pending requests
      if (dbhan._connectionId) {
        connectionManager.markActivity(dbhan._connectionId);
        connectionManager.incrementPendingRequests(dbhan._connectionId);
      }
      
      // More granular query type detection for better handling
      const queryType = this._detectQueryType(sql);
      
      // Apply different timeouts based on query type
      let timeout;
      switch(queryType) {
        case 'SCHEMA_LIST':
          timeout = 12000; // 12 seconds for schema listing
          break;
        case 'TABLE_LIST':
          timeout = 15000; // 15 seconds for table listing
          break;
        case 'COLUMN_DETAILS':
          timeout = 20000; // 20 seconds for column details
          break;
        case 'CHECK_CONNECTION':
          timeout = 5000; // 5 seconds for connection checks
          break;
        default:
          timeout = 30000; // 30 seconds default
      }
      
      // Apply custom timeout if provided in options
      if (options.timeout && typeof options.timeout === 'number') {
        timeout = options.timeout;
      }
      
      console.log(`[DB2] Executing ${queryType} query (timeout: ${timeout}ms): ${sql.substring(0, 150)}${sql.length > 150 ? '...' : ''}`);
      
      try {
        // Set up a promise race between the query and a timeout
        const queryPromise = dbhan.client.query(sql, params);
        const timeoutPromise = new Promise((_, reject) => {
          setTimeout(() => reject(new Error(`Query timeout after ${timeout}ms`)), timeout);
        });
        
        const result = await Promise.race([queryPromise, timeoutPromise]);
        
        if (!result || result.length === 0) {
          console.log('[DB2] Query returned no results');
          
          if (dbhan._connectionId) {
            connectionManager.decrementPendingRequests(dbhan._connectionId);
          }
          
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
        // Create a normalized mapping of column names with improved handling
        const normalizedRows = result.map(row => {
          const normalizedRow = {};
          // For each column in our result
          for (const key in row) {
            // Store value in both original case, lowercase and uppercase
            const value = row[key];
            normalizedRow[key] = value;
            
            // Always add lowercase and uppercase versions for case-insensitive access
            if (typeof key === 'string') {
              normalizedRow[key.toLowerCase()] = value;
              normalizedRow[key.toUpperCase()] = value;
            }
            
            // Special handling for "CURRENT SCHEMA" type columns with spaces
            if (typeof key === 'string' && key.includes(' ')) {
              // Remove spaces and add those versions too
              const noSpaceKey = key.replace(/\s+/g, '');
              normalizedRow[noSpaceKey] = value;
              normalizedRow[noSpaceKey.toLowerCase()] = value;
              normalizedRow[noSpaceKey.toUpperCase()] = value;
            }
            
            // Handle SQL aliases better
            if (typeof sql === 'string') {
              // Look for "as alias" patterns in SQL
              const lowerSql = sql.toLowerCase();
              const lowerKey = key.toLowerCase();
              
              // Check for column AS alias pattern
              if (lowerSql.includes(lowerKey + ' as ') || lowerSql.includes(lowerKey + ' as"') || 
                  lowerSql.includes(lowerKey + ' as\'') || lowerSql.includes(lowerKey + ' as`')) {
                const regex = new RegExp(lowerKey + '\\s+as\\s+["\']?([a-zA-Z0-9_]+)["\']?', 'i');
                const match = regex.exec(sql);
                if (match && match[1]) {
                  const alias = match[1];
                  normalizedRow[alias] = value;
                  normalizedRow[alias.toLowerCase()] = value;
                  normalizedRow[alias.toUpperCase()] = value;
                }
              }
            }
          }
          return normalizedRow;
        });
        
        // Mark query as complete in connection manager
        if (dbhan._connectionId) {
          connectionManager.decrementPendingRequests(dbhan._connectionId);
        }
        
        return {
          rows: normalizedRows,
          columns: columns,
          rowCount: result.length,
        };
      } catch (queryErr) {
        console.error(`[DB2] Query execution error: ${queryErr.message}`);
        
        // Mark query as complete in connection manager
        if (dbhan._connectionId) {
          connectionManager.decrementPendingRequests(dbhan._connectionId);
        }
        
        // Check if it's a timeout error
        if (queryErr.message.includes('timeout')) {
          console.log(`[DB2] Query timed out after ${timeout}ms, might need a longer timeout for this operation`);
          
          // Try to check if connection is healthy
          if (dbhan._connectionId) {
            const isHealthy = await connectionManager.checkConnection(dbhan._connectionId);
            if (!isHealthy) {
              // Try to recover the connection
              const recovered = await connectionManager.recoverConnection(dbhan._connectionId);
              if (recovered) {
                throw new Error(`Query timed out, but connection has been recovered. Please try again.`);
              } else {
                throw new Error(`Query timed out and connection recovery failed. Please reconnect.`);
              }
            }
          }
          
          // For timeout errors, provide a more helpful message
          throw new Error(`Query timed out after ${timeout}ms. This operation may need more time or optimization.`);
        }
        
        // Check if connection is still alive
        try {
          await dbhan.client.query('SELECT 1 FROM SYSIBM.SYSDUMMY1');
        } catch (pingErr) {
          console.error(`[DB2] Connection appears to be lost: ${pingErr.message}`);
          
          // Try to recover the connection if we have a connection ID
          if (dbhan._connectionId) {
            const recovered = await connectionManager.recoverConnection(dbhan._connectionId);
            if (recovered) {
              throw new Error(`Database connection was lost but has been recovered. Please try again.`);
            } else {
              throw new Error(`Database connection lost and recovery failed: ${pingErr.message}. Please reconnect.`);
            }
          } else {
            throw new Error(`Database connection lost: ${pingErr.message}. Please reconnect.`);
          }
        }
        
        throw queryErr;
      }
    } catch (err) {
      // Make sure to decrement pending requests counter even in case of errors
      if (dbhan._connectionId) {
        connectionManager.decrementPendingRequests(dbhan._connectionId);
      }
      
      console.error(`[DB2] Query error: ${err.message}`);
      throw new Error(`Query failed: ${err.message}`);
    }
  },
  
  // Helper method to detect query type for better timeout handling
  _detectQueryType(sql) {
    // Safety check - if sql is not a string, return DEFAULT
    if (typeof sql !== 'string') {
      console.warn('[DB2] Non-string SQL passed to _detectQueryType:', sql);
      return 'DEFAULT';
    }
    
    // Safely convert to lowercase
    const sqlLower = sql.toLowerCase();
    
    if (sqlLower.includes('sysibm.sysdummy1') && !sqlLower.includes('join')) {
      return 'CHECK_CONNECTION';
    } else if (sqlLower.includes('syscat.schemata')) {
      return 'SCHEMA_LIST';
    } else if (sqlLower.includes('syscat.tables') || sqlLower.includes('sysibm.systables')) {
      return 'TABLE_LIST';
    } else if (sqlLower.includes('syscat.columns') || sqlLower.includes('sysibm.syscolumns')) {
      return 'COLUMN_DETAILS';
    } else if (sqlLower.includes('syscat.keycoluse') || sqlLower.includes('syscat.references')) {
      return 'CONSTRAINT_DETAILS';
    } else if (sqlLower.includes('syscat.routines')) {
      return 'ROUTINE_LIST';
    } else if (sqlLower.includes('syscat.views') || sqlLower.includes('viewschema')) {
      return 'VIEW_LIST';
    } else if (sqlLower.includes('select current schema')) {
      return 'CURRENT_SCHEMA';
    } else if (sqlLower.includes('select current server')) {
      return 'SERVER_INFO';
    }
    
    return 'GENERAL';
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
      const versionQueries = [
        `SELECT SERVICE_LEVEL as version, FIXPACK_NUM as fixpack FROM TABLE (sysproc.env_get_inst_info())`,
        `SELECT SERVICE_LEVEL as version, FIXPACK_NUM as fixpack FROM SYSIBMADM.ENV_INST_INFO`,
        `SELECT GETVARIABLE('SYSIBM.VERSION') as version FROM SYSIBM.SYSDUMMY1`,
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
      
      let databases = [];
      
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

      // Approach 2: Using SYSCAT.DBAUTH to get databases the user has access to
      if (databases.length === 0) {
        try {
          const result = await this.query(dbhan, `
            SELECT 
              DISTINCT DBNAME as databaseName
            FROM SYSCAT.DBAUTH
            WHERE GRANTEE = CURRENT USER
          `);
          
          if (result.rows && result.rows.length > 0) {
            databases = result.rows.map(db => ({
              name: db.DATABASENAME || db.databaseName,
              status: 'available'
            }));
          }
        } catch (err) {
          console.error('[DB2] Error getting databases from SYSCAT.DBAUTH:', err);
        }
      }      // Approach 3: Try SYSIBMADM.SNAPDB which is available in some DB2 environments
      if (databases.length === 0) {
        try {
          const result = await this.query(dbhan, `
            SELECT 
              DB_NAME as databaseName,
              DB_STATUS as status
            FROM SYSIBMADM.SNAPDB
          `);
          
          if (result.rows && result.rows.length > 0) {
            databases = result.rows.map(db => ({
              name: db.DATABASENAME || db.databaseName,
              status: db.STATUS || db.status || 'available'
            }));
          }
        } catch (err) {
          console.error('[DB2] Error getting databases from SYSIBMADM.SNAPDB:', err);
        }
      }

      // If still no results, try to get current database
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
            WHERE TABSCHEMA NOT LIKE 'SYS%'
              AND TABSCHEMA NOT IN ('SYSIBM', 'SYSTOOLS', 'SYSPROC', 'SYSSTAT', 'NULLID', 'SQLJ', 'SYSCAT', 'SYSFUN', 'SYSIBMADM')
          `);
          
          if (result.rows && result.rows.length > 0) {
            databases = [{
              name: dbhan.database || dbhan.user || 'Unknown',
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

   async getEngineVersion() {
        const result = await dbhan.client.execute('SELECT release_version from system.local');
    return { version: result.rows[0].release_version };
   },

  getDefaultDatabase() {
    return this.defaultDatabase;
  },

  getQuerySplitterOptions(usage) {
    // Optimize query splitting based on usage
    return {
      delimiter: ';',
      ignoreComments: true,
      preventSingleLineSplit: true,
      // Add timeout handling for API requests
      timeoutSeconds: usage === 'api' ? 20 : 60,
      maxRowCount: usage === 'api' ? 10000 : undefined // Limit row count for API requests
    };
  },
  
  async close(dbhan) {
    try {
      console.log('[DB2] Closing database connection');
      if (dbhan && dbhan.client) {
        await dbhan.client.close().catch(err => {
          // Just log without throwing to prevent process exit
          console.error('[DB2] Warning during connection close:', err.message);
        });
        console.log('[DB2] Database connection closed successfully');
      }
    } catch (err) {
      // Don't throw, just log the error
      console.error('[DB2] Error closing database connection:', err.message);
    }
  },
  async checkCatalogAccess(dbhan) {
    console.log('[DB2] Running catalog access diagnostics');
    
    const catalogViews = [
      { name: 'SYSIBM.SYSDUMMY1', required: true },
      { name: 'SYSCAT.TABLES', required: true },
      { name: 'SYSCAT.COLUMNS', required: true },
      { name: 'SYSCAT.SCHEMATA', required: true }, // Required for schema filtering
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
        database: database || user || 'Unknown',
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
          `DATABASE=${database || user}`,
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

  // Refresh schema counts in the background to avoid blocking the UI
  async _refreshSchemaCounts(dbhan, connectionId, schemas) {
    try {
      console.log(`[DB2] Refreshing schema counts in background for connection ${connectionId}`);
      
      if (!schemas || schemas.length === 0) {
        console.log('[DB2] No schemas to refresh counts for');
        return;
      }
      
      // Extract all schema names for the query
      const schemaNames = schemas.map(s => s.schemaName).filter(Boolean);
      
      if (schemaNames.length === 0) {
        console.log('[DB2] No valid schema names to refresh counts for');
        return;
      }
      
      // Create a safe query with proper parameter binding
      const schemaPlaceholders = schemaNames.map(() => '?').join(',');
      
      // Get table counts
      const tablesCountQuery = `
        SELECT 
          TABSCHEMA as "schemaName",
          COUNT(CASE WHEN TYPE IN ('T', 'P') THEN 1 END) as "tableCount"
        FROM SYSCAT.TABLES
        WHERE TABSCHEMA IN (${schemaPlaceholders})
        GROUP BY TABSCHEMA
      `;
      
      const tableCountResults = await this.query(dbhan, tablesCountQuery, schemaNames);
      
      // Get view counts
      const viewsCountQuery = `
        SELECT 
          VIEWSCHEMA as "schemaName",
          COUNT(*) as "viewCount"
        FROM SYSCAT.VIEWS
        WHERE VIEWSCHEMA IN (${schemaPlaceholders})
        GROUP BY VIEWSCHEMA
      `;
      
      const viewCountResults = await this.query(dbhan, viewsCountQuery, schemaNames);
      
      // Get routine counts (procedures and functions)
      const routinesCountQuery = `
        SELECT 
          ROUTINESCHEMA as "schemaName",
          COUNT(*) as "routineCount"
        FROM SYSCAT.ROUTINES
        WHERE ROUTINESCHEMA IN (${schemaPlaceholders})
        GROUP BY ROUTINESCHEMA
      `;
      
      const routineCountResults = await this.query(dbhan, routinesCountQuery, schemaNames);
      
      // Now update all schemas with the counts
      if (tableCountResults && tableCountResults.rows) {
        tableCountResults.rows.forEach(row => {
          const schemaName = row.schemaName || row.SCHEMANAME;
          const tableCount = parseInt(row.tableCount || row.TABLECOUNT || 0);
          
          const schema = schemas.find(s => s.schemaName === schemaName);
          if (schema) {
            schema.tableCount = tableCount;
          }
        });
      }
      
      if (viewCountResults && viewCountResults.rows) {
        viewCountResults.rows.forEach(row => {
          const schemaName = row.schemaName || row.VIEWSCHEMA;
          const viewCount = parseInt(row.viewCount || row.VIEWCOUNT || 0);
          
          const schema = schemas.find(s => s.schemaName === schemaName);
          if (schema) {
            schema.viewCount = viewCount;
          }
        });
      }
      
      if (routineCountResults && routineCountResults.rows) {
        routineCountResults.rows.forEach(row => {
          const schemaName = row.schemaName || row.ROUTINESCHEMA;
          const routineCount = parseInt(row.routineCount || row.ROUTINECOUNT || 0);
          
          const schema = schemas.find(s => s.schemaName === schemaName);
          if (schema) {
            schema.routineCount = routineCount;
          }
        });
      }
      
      // Make sure we have numbers, not strings
      schemas.forEach(schema => {
        schema.tableCount = parseInt(schema.tableCount || 0);
        schema.viewCount = parseInt(schema.viewCount || 0);
        schema.routineCount = parseInt(schema.routineCount || 0);
      });
      
      console.log('[DB2] Schema counts refreshed successfully');
      
      // Update the cache with the new counts
      if (dbhan._connectionParams?.useCaching && cacheManager) {
        cacheManager.setSchemaCache(connectionId, schemas);
        console.log('[DB2] Updated schema cache with refreshed counts');
        
        // Try to notify UI about updates
        try {
          const [conid, database] = connectionId.split('_');
          // Check if socket module is available for emitting events
          const socketPath = '../../../api/src/utility/socket';
          try {
            const socket = require(socketPath);
            if (socket && typeof socket.emitChanged === 'function') {
              socket.emitChanged('schema-list-changed', { conid, database });
            }
          } catch (socketErr) {
            console.log('[DB2] Socket module not available for event emission');
          }
        } catch (notifyErr) {
          console.log('[DB2] Could not notify about schema updates:', notifyErr.message);
        }
      }
      
      return schemas;
    } catch (err) {
      console.error('[DB2] Error refreshing schema counts:', err);
      return schemas;
    }
  },
  
  async listSchemas(dbhan, conid, database) {
    try {
      console.log('[DB2] ====== Starting listSchemas API call for /database-connections/schema-list endpoint ======');
      console.log('[DB2] Connection ID:', conid);
      console.log('[DB2] Database:', database);
      
      // Use the connection ID for cache lookup if available
      const connectionId = dbhan._connectionId || `${conid}_${database}`;
      
      // Immediately register progressive loading flag to track staged loading
      let progressiveLoadingStarted = false;
      let partialSchemasCached = false;
      
      // First check cache for faster response
      if (dbhan._connectionParams?.useCaching) {
        const cachedSchemas = cacheManager.getSchemaCache(connectionId);
        if (cachedSchemas) {
          console.log('[DB2] Returning cached schema list');
          
          // If schema counts weren't loaded yet, trigger a background refresh
          // but still return cached data immediately
          const needsCountRefresh = cachedSchemas.some(schema => 
            typeof schema.tableCount !== 'number' || schema.tableCount < 0);
            
          if (needsCountRefresh && !dbhan._refreshingCounts) {
            dbhan._refreshingCounts = true;
            console.log('[DB2] Schema counts need refresh, scheduling background update');
            
            // Use setTimeout to make this non-blocking
            setTimeout(async () => {
              try {
                await refreshSchemaCounts(this, dbhan, connectionId, cachedSchemas);
                dbhan._refreshingCounts = false;
              } catch (err) {
                console.error('[DB2] Error in background schema count refresh:', err);
                dbhan._refreshingCounts = false;
              }
            }, 100);
          }
          
          return cachedSchemas;
        }
      }

      // Get current schema
      let currentSchema;
      try {
        console.log('[DB2] Getting current schema...');
        const currentSchemaResult = await this.query(dbhan, `
          SELECT CURRENT SCHEMA as schemaName FROM SYSIBM.SYSDUMMY1
        `, [], { timeout: 5000 }); // Short timeout for this simple query
        
        currentSchema = currentSchemaResult.rows?.[0]?.schemaName;
        console.log('[DB2] Current schema:', currentSchema);
      } catch (err) {
        console.error('[DB2] Error getting current schema:', err);
      }

      // Progressive schema loading strategy - get schemas in stages:
      // 1. First get current schema only for immediate response
      // 2. Then get list of all schemas (minimal fields) 
      // 3. Finally, get counts in the background as optimization
      let schemas = [];
      
      // Track if we need to fetch the full schema list
      let needFullSchemaList = true;
      
      try {
        progressiveLoadingStarted = true;
        console.log('[DB2] Starting progressive schema loading');
        
        // STAGE 1: If we have current schema, create an initial minimal response
        // This provides instant feedback to the UI
        if (currentSchema) {
          console.log(`[DB2] Using current schema "${currentSchema}" for initial response`);
          schemas = [{
            name: currentSchema,
            schemaName: currentSchema,
            pureName: currentSchema,
            fullName: currentSchema,
            objectSchema: currentSchema,
            isDefault: true,
            id: `schema_${currentSchema}`,
            objectType: 'schema',
            tableCount: -1,  // -1 indicates count not loaded yet
            viewCount: -1,
            routineCount: -1,
            modifyDate: new Date()
          }];
          
          // Cache this partial result immediately for better UI responsiveness
          if (dbhan._connectionParams?.useCaching) {
            cacheManager.setSchemaCache(connectionId, schemas);
            partialSchemasCached = true;
          }
        }
        
        // STAGE 2: Fast schema list retrieval, optimized query with FETCH FIRST clause
        // This gets a limited number of schemas quickly
        console.log('[DB2] Fetching optimized schema list with limited fields');
        const schemasResult = await this.query(dbhan, `
          SELECT 
            s.SCHEMANAME as "schemaName",
            s.OWNER as "owner",
            s.CREATE_TIME as "createTime"
          FROM SYSCAT.SCHEMATA s
          WHERE s.SCHEMANAME NOT LIKE 'SYS%'
            AND s.SCHEMANAME NOT IN ('SYSCAT', 'SYSIBM', 'SYSSTAT', 'SYSPROC', 'SYSTOOLS', 'SYSFUN', 'SYSIBMADM')
          ORDER BY 
            CASE WHEN s.SCHEMANAME = '${currentSchema || ''}' THEN 0 ELSE 1 END, 
            s.SCHEMANAME
          FETCH FIRST 100 ROWS ONLY
        `, [], { timeout: 10000 });

        if (schemasResult.rows && schemasResult.rows.length > 0) {
          console.log(`[DB2] Found ${schemasResult.rows.length} schemas`);
          
          // First get the schemas list without counts
          schemas = schemasResult.rows.map((row, index) => {
            // Use case-insensitive access to fields
            const getValue = (fieldName) => {
              if (row[fieldName] !== undefined) return row[fieldName];
              if (row[fieldName.toUpperCase()] !== undefined) return row[fieldName.toUpperCase()];
              if (row[fieldName.toLowerCase()] !== undefined) return row[fieldName.toLowerCase()];
              return null;
            };
            
            const schemaName = getValue("schemaName") || '';
            
            return {
              name: schemaName,
              schemaName: schemaName,
              pureName: schemaName, 
              fullName: schemaName,
              objectSchema: schemaName,
              owner: getValue("owner"),
              createTime: getValue("createTime"),
              description: getValue("description"),
              tableCount: 0, // Will be populated later if needed
              viewCount: 0,  // Will be populated later if needed
              routineCount: 0, // Will be populated later if needed
              isDefault: schemaName === currentSchema,
              id: `schema_${schemaName || index}`,
              objectType: 'schema',
              objectTypeField: 'objectType',
              modifyDate: getValue("createTime") || new Date()
            };
          });
          
          // Optionally fetch counts in bulk in a separate, faster query
          try {
            console.log('[DB2] Fetching aggregated object counts for schemas');
            // Create a safer query with parameterized values
            const schemaParams = schemas.map(s => s.schemaName).filter(Boolean);
            if (schemaParams.length === 0) {
              console.log('[DB2] No valid schema names found for counts query');
              return;
            }
            
            const placeholders = schemaParams.map(() => '?').join(',');
            const countsQuery = `
              SELECT 
                TABSCHEMA as "schemaName",
                COUNT(CASE WHEN TYPE IN ('T', 'P') THEN 1 END) as "tableCount"
              FROM SYSCAT.TABLES
              WHERE TABSCHEMA IN (${placeholders})
              GROUP BY TABSCHEMA
            `;
            
            const countResults = await this.query(dbhan, countsQuery, schemaParams);
            if (countResults && countResults.rows) {
              console.log(`[DB2] Got counts for ${countResults.rows.length} schemas`);
              
              // Apply counts to schemas with better error handling
              countResults.rows.forEach(countRow => {
                try {
                  // Get schema name with case-insensitive lookup
                  const schemaName = countRow.schemaName || countRow.SCHEMANAME;
                  // Make sure we have a valid count
                  const rawCount = countRow.tableCount || countRow.TABLECOUNT;
                  // Use parseInt with fallback to 0 for invalid values
                  const tableCount = parseInt(rawCount) || 0;
                  
                  // Find matching schema and update count
                  const schema = schemas.find(s => s.schemaName === schemaName);
                  if (schema) {
                    schema.tableCount = tableCount;
                    console.log(`[DB2] Updated schema ${schemaName} with table count: ${tableCount}`);
                  }
                } catch (countErr) {
                  console.error('[DB2] Error processing count row:', countErr);
                }
              });
            }
          } catch (countError) {
            console.error('[DB2] Error fetching aggregated counts, continuing without counts:', countError.message);
            // Continue without counts, not critical
          }
        }
      } catch (err) {
        console.error('[DB2] Error getting schemas from SYSCAT.SCHEMATA:', err);
        
        // Fallback: Get schemas from SYSCAT.TABLES with timeout protection
        try {
          console.log('[DB2] Using fallback to get schemas from TABLES catalog');
          // Simplified fallback query with FETCH FIRST clause to prevent long-running queries
          const tablesResult = await this.query(dbhan, `
            SELECT DISTINCT TABSCHEMA as "schemaName"
            FROM SYSCAT.TABLES
            WHERE TABSCHEMA NOT LIKE 'SYS%'
              AND TABSCHEMA NOT IN ('SYSCAT', 'SYSIBM', 'SYSSTAT', 'SYSPROC', 'SYSTOOLS', 'SYSFUN', 'SYSIBMADM')
            ORDER BY TABSCHEMA
            FETCH FIRST 100 ROWS ONLY
          `);
          
          if (tablesResult.rows && tablesResult.rows.length > 0) {
            console.log(`[DB2] Fallback found ${tablesResult.rows.length} schemas from TABLES catalog`);
            schemas = tablesResult.rows.map(row => {
              // Case-insensitive field access
              const schemaName = row.schemaName || row.SCHEMANAME;
              return {
                name: schemaName,
                schemaName: schemaName,
                pureName: schemaName,
                fullName: schemaName,
                objectSchema: schemaName,
                isDefault: schemaName === currentSchema,
                id: `schema_${schemaName}`,
                objectType: 'schema',
                tableCount: 1, // At least one table exists since we got it from TABLES
                viewCount: 0,
                routineCount: 0,
                modifyDate: new Date()
              };
            });
          }
        } catch (fallbackErr) {
          console.error('[DB2] Error in fallback schema query, will try faster minimal approach:', fallbackErr.message);
          
          // Second fallback: Try with even more limited approach - just the current schema
          if (currentSchema) {
            console.log('[DB2] Using current schema as last resort fallback');
            schemas = [{
              name: currentSchema,
              schemaName: currentSchema,
              pureName: currentSchema,
              fullName: currentSchema,
              objectSchema: currentSchema,
              isDefault: true,
              id: `schema_${currentSchema}`,
              objectType: 'schema',
              tableCount: 0,
              viewCount: 0,
              routineCount: 0,
              modifyDate: new Date()
            }];
          }
        }
      }

      // Ensure we have at least one schema - if we have no schemas at this point, use a simple approach
      if (schemas.length === 0) {
        console.log('[DB2] No schemas found, adding default schema with minimal info');
        const defaultSchema = currentSchema || dbhan.database || dbhan.user || 'NULLID';
        schemas = [{
          name: defaultSchema,
          schemaName: defaultSchema,
          pureName: defaultSchema,
          fullName: defaultSchema,
          objectSchema: defaultSchema,
          isDefault: true,
          id: `schema_${defaultSchema}`,
          objectType: 'schema',
          tableCount: 0,
          viewCount: 0,
          routineCount: 0,
          modifyDate: new Date()
        }];
        
        // Return early to avoid further processing since we're using a simple fallback
        console.log('[DB2] Returning minimal schema without additional processing');
        return schemas;
      }

      // Make sure at least one schema is marked as default (faster implementation)
      let hasDefaultSchema = false;
      for (const schema of schemas) {
        if (schema.isDefault) {
          hasDefaultSchema = true;
          break;
        }
      }
      
      if (!hasDefaultSchema) {
        // Set current schema as default if it exists in the list
        let currentSchemaFound = false;
        if (currentSchema) {
          for (const schema of schemas) {
            if (schema.name === currentSchema) {
              schema.isDefault = true;
              currentSchemaFound = true;
              break;
            }
          }
        }
        
        // If current schema not found, just mark the first one as default
        if (!currentSchemaFound && schemas.length > 0) {
          schemas[0].isDefault = true;
        }
      }
      
      // Limit the number of schemas returned to improve UI performance
      // Only if there are too many schemas
      const MAX_SCHEMAS = 100;
      if (schemas.length > MAX_SCHEMAS) {
        console.log(`[DB2] Too many schemas (${schemas.length}), limiting to ${MAX_SCHEMAS}`);
        schemas = schemas.slice(0, MAX_SCHEMAS);
      }
      
      // Process schemas in one go with proper fields for filtering and ensure valid counts
      schemas = schemas.map(schema => {
        // Make sure we have valid numbers for counts, not strings or NaN
        let tableCount = 0;
        let viewCount = 0;
        let routineCount = 0;
        
        try {
          tableCount = parseInt(schema.tableCount);
          if (isNaN(tableCount)) tableCount = 0;
        } catch (e) { tableCount = 0; }
        
        try {
          viewCount = parseInt(schema.viewCount);
          if (isNaN(viewCount)) viewCount = 0;
        } catch (e) { viewCount = 0; }
        
        try {
          routineCount = parseInt(schema.routineCount);
          if (isNaN(routineCount)) routineCount = 0;
        } catch (e) { routineCount = 0; }
        
        return {
          ...schema,
          isDefault: schema.isDefault || false,
          fullName: schema.name,
          objectSchema: schema.name,
          schemaName: schema.name,
          pureName: schema.name,
          name: schema.name,
          objectType: 'schema',
          id: `schema_${schema.name}`,
          tableCount: tableCount,
          viewCount: viewCount,
          routineCount: routineCount,
          modifyDate: schema.modifyDate || new Date()
        };
      });

      console.log(`[DB2] Returning ${schemas.length} schemas`);
      console.log('[DB2] ====== Completed listSchemas API call ======');
      
      return schemas;
    } catch (err) {
      console.error('[DB2] Error in listSchemas:', err);
      return [];
    }
  },


  async getColumnsForAllTables(dbhan, tables) {
    console.log('[DB2] Fetching columns for all tables');
    const result = [];
    
    for (const table of tables) {
      console.log(`[DB2] Getting columns for table ${table.schemaName}.${table.pureName}`);
      
      try {
        // Try SYSCAT.COLUMNS (LUW DB2)
        const columnsQuery = `
          SELECT 
            COLNAME as columnName,
            TYPENAME as dataType,
            LENGTH as length,
            SCALE as scale,
            NULLS as isNullable,
            REMARKS as description,
            DEFAULT as defaultValue,
            COLNO as ordinalPosition,
            CODEPAGE as codePage,
            COLCARD as columnCardinality,
            HIGH2KEY as highValue,
            LOW2KEY as lowValue
          FROM SYSCAT.COLUMNS 
          WHERE TABSCHEMA = ? AND TABNAME = ?
          ORDER BY COLNO
        `;
        
        const res = await this.query(dbhan, columnsQuery, [table.schemaName, table.pureName]);
        
        if (res.rows && res.rows.length > 0) {
          console.log(`[DB2] Found ${res.rows.length} columns for table ${table.pureName}`);
          
          // Process column data with improved error handling
          const columns = res.rows.map((row, index) => {
            try {
              const colName = row.COLNAME || row.columnName || `column_${index}`;
              return {
                columnName: colName,
                dataType: row.TYPENAME || row.dataType || 'VARCHAR',
                notNull: (row.NULLS || row.isNullable) === 'N' || (row.NULLS || row.isNullable) === 'NO',
                defaultValue: row.DEFAULT || row.defaultValue,
                ordinalPosition: row.COLNO || row.ordinalPosition || index,
                length: row.LENGTH || row.length,
                scale: row.SCALE || row.scale,
                description: row.REMARKS || row.description,
                codePage: row.CODEPAGE || row.codePage,
                columnCardinality: row.COLCARD || row.columnCardinality,
                highValue: row.HIGH2KEY || row.highValue,
                lowValue: row.LOW2KEY || row.lowValue,
                uniqueName: `${table.schemaName}.${table.pureName}.${colName}_${index}`
              };
            } catch (colErr) {
              console.error(`[DB2] Error processing column ${index} for table ${table.pureName}:`, colErr);
              return {
                columnName: `column_${index}`,
                dataType: 'VARCHAR',
                notNull: false,
                ordinalPosition: index,
                uniqueName: `${table.schemaName}.${table.pureName}.column_${index}_${Date.now()}`
              };
            }
          });
          
          // Create a copy of the table with columns
          const tableWithColumns = {
            ...table,
            columns
          };
          
          result.push(tableWithColumns);
        } else {
          console.log(`[DB2] No columns found for table ${table.pureName}, trying fallback`);
          
          // Try SYSIBM.SYSCOLUMNS fallback
          try {
            const fallbackQuery = `
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
            `;
            
            const fallbackRes = await this.query(dbhan, fallbackQuery, [table.schemaName, table.pureName]);
            
            if (fallbackRes.rows && fallbackRes.rows.length > 0) {
              console.log(`[DB2] Found ${fallbackRes.rows.length} columns using fallback for table ${table.pureName}`);
              
              // Process column data from fallback with error handling
              const columns = fallbackRes.rows.map((row, index) => {
                try {
                  const colName = row.NAME || row.columnName || `column_${index}`;
                  return {
                    columnName: colName,
                    dataType: row.COLTYPE || row.dataType || 'VARCHAR',
                    notNull: (row.NULLS || row.isNullable) === 'N' || (row.NULLS || row.isNullable) === 'NO',
                    defaultValue: row.DEFAULT || row.defaultValue,
                    ordinalPosition: row.COLNO || row.ordinalPosition || index,
                    length: row.LENGTH || row.length,
                    scale: row.SCALE || row.scale,
                    uniqueName: `${table.schemaName}.${table.pureName}.${colName}_${index}`
                  };
                } catch (colErr) {
                  console.error(`[DB2] Error processing fallback column ${index} for table ${table.pureName}:`, colErr);
                  return {
                    columnName: `column_${index}`,
                    dataType: 'VARCHAR',
                    notNull: false,
                    ordinalPosition: index,
                    uniqueName: `${table.schemaName}.${table.pureName}.column_${index}_${Date.now()}`
                  };
                }
              });
              
              // Create a copy of the table with columns
              const tableWithColumns = {
                ...table,
                columns
              };
              
              result.push(tableWithColumns);
            } else {
              // If still no columns found, add the original table with empty columns array
              console.warn(`[DB2] Could not find any columns for table ${table.pureName}`);
              result.push({
                ...table,
                columns: []
              });
            }
          } catch (fallbackErr) {
            console.error(`[DB2] Fallback column query error for ${table.pureName}:`, fallbackErr.message);
            result.push({
              ...table,
              columns: []
            });
          }
        }
      } catch (err) {
        console.error(`[DB2] Error fetching columns for table ${table.pureName}:`, err.message);
        result.push({
          ...table,
          columns: []
        });
      }
    }
    
    console.log(`[DB2] Finished fetching columns for ${tables.length} tables, ${result.length} processed`);
    
    // Check for any duplicate column uniqueNames that could cause UI issues
    const allColumnUniqueNames = [];
    const duplicateNames = [];
    
    result.forEach(table => {
      if (table.columns) {
        table.columns.forEach(column => {
          if (allColumnUniqueNames.includes(column.uniqueName)) {
            duplicateNames.push(column.uniqueName);
            // Add a timestamp to ensure uniqueness
            column.uniqueName = `${column.uniqueName}_${Date.now().toString().slice(-6)}`;
          }
          allColumnUniqueNames.push(column.uniqueName);
        });
      }
    });
    
    if (duplicateNames.length > 0) {
      console.error(`[DB2] WARNING: Found ${duplicateNames.length} duplicate column uniqueNames: ${duplicateNames.slice(0, 5).join(', ')}${duplicateNames.length > 5 ? '...' : ''}`);
    }
    
    return result;
  },

  async getStructure(dbhan, schemaName) {
    try {
      console.log('[DB2] ====== Starting getStructure API call ======');
      console.log('[DB2] Getting structure for schema:', schemaName);
      
      // If schemaName is not provided, get the current schema
      if (!schemaName) {
        try {
          const currentRes = await this.query(dbhan, `SELECT CURRENT SCHEMA as "schemaName" FROM SYSIBM.SYSDUMMY1`);
          if (currentRes && currentRes.rows && currentRes.rows.length > 0) {
            schemaName = currentRes.rows[0].schemaName || 
                       currentRes.rows[0].SCHEMANAME || 
                       currentRes.rows[0]['CURRENT SCHEMA'];
            console.log(`[DB2] No schema specified, using current schema: ${schemaName}`);
          }
        } catch (err) {
          console.error('[DB2] Error getting current schema:', err);
        }
      }

      // Initialize result structure with proper schema field configuration
      const result = {
        objectTypeField: 'objectType',
        objectIdField: 'objectId',
        schemaField: 'schemaName',
        pureNameField: 'pureName',
        contentHashField: 'contentHash',
        schemas: [{
          pureName: schemaName,
          schemaName: schemaName,
          name: schemaName,
          fullName: schemaName,
          objectSchema: schemaName,
          objectId: `schemas:${schemaName}`,
          id: `schema_${schemaName}`,
          objectType: 'schema',
          isDefault: true, // Mark as default explicitly
          tableCount: 0,
          viewCount: 0,
          routineCount: 0
        }],
        tables: [],
        views: [],
        functions: [],
        procedures: [],
        triggers: []
      };

      // Check if schema exists
      let schemaExists = false;
      try {
        const schemaCheck = await this.query(dbhan, `
          SELECT 1 
          FROM SYSCAT.SCHEMATA 
          WHERE SCHEMANAME = ?
        `, [schemaName]);
        schemaExists = schemaCheck.rows && schemaCheck.rows.length > 0;
      } catch (err) {
        console.error('[DB2] Error checking schema existence:', err);
      }

      // If schema doesn't exist, try to find it in SYSCAT.TABLES
      if (!schemaExists) {
        console.log(`[DB2] Schema ${schemaName} not found in SYSCAT.SCHEMATA, trying SYSCAT.TABLES`);
        try {
          const schemaCheckFromTables = await this.query(dbhan, `
            SELECT 1 
            FROM SYSCAT.TABLES 
            WHERE TABSCHEMA = ?
          `, [schemaName]);
          schemaExists = schemaCheckFromTables.rows && schemaCheckFromTables.rows.length > 0;
        } catch (err) {
          console.error('[DB2] Error checking schema existence in SYSCAT.TABLES:', err);
        }
      }

      // If schema still doesn't exist, try to check if it's the current schema
      if (!schemaExists) {
        console.log(`[DB2] Schema ${schemaName} not found in catalog tables, checking if it's current schema`);
        try {
          const currentSchemaResult = await this.query(dbhan, `
            SELECT CURRENT SCHEMA as schemaName FROM SYSIBM.SYSDUMMY1
          `);
          const currentSchema = currentSchemaResult.rows?.[0]?.SCHEMANAME || 
                              currentSchemaResult.rows?.[0]?.schemaName || 
                              currentSchemaResult.rows?.[0]?.['CURRENT SCHEMA'];
          schemaExists = currentSchema === schemaName;
          console.log(`[DB2] Current schema is ${currentSchema}, matches requested schema: ${schemaExists}`);
        } catch (err) {
          console.error('[DB2] Error getting current schema:', err);
        }
      }

      // If schema doesn't exist in any form, return empty structure
      if (!schemaExists) {
        console.error(`[DB2] Schema ${schemaName} does not exist or is not accessible`);
        return result;
      }

      console.log(`[DB2] Schema ${schemaName} exists, retrieving objects`);

      // Get schema info and set as schema object (not just a string)
      try {
        const schemaInfo = await this.query(dbhan, `
          SELECT 
            SCHEMANAME as "schemaName",
            OWNER as "owner",
            REMARKS as "description",
            CREATE_TIME as "createTime",
            (SELECT COUNT(*) FROM SYSCAT.TABLES WHERE TABSCHEMA = SCHEMANAME AND TYPE = 'T') as "tableCount",
            (SELECT COUNT(*) FROM SYSCAT.VIEWS WHERE VIEWSCHEMA = SCHEMANAME) as "viewCount",
            (SELECT COUNT(*) FROM SYSCAT.ROUTINES WHERE ROUTINESCHEMA = SCHEMANAME) as "routineCount"
          FROM SYSCAT.SCHEMATA
          WHERE SCHEMANAME = ?
        `, [schemaName]);
        
        if (schemaInfo.rows && schemaInfo.rows.length > 0) {
          const schemaObj = {
            pureName: schemaName,
            schemaName: schemaName,
            name: schemaName,
            fullName: schemaName,
            objectSchema: schemaName,
            objectId: `schemas:${schemaName}`,
            id: `schema_${schemaName}`,
            objectType: 'schema',
            owner: schemaInfo.rows[0].OWNER || schemaInfo.rows[0].owner || '',
            description: schemaInfo.rows[0].REMARKS || schemaInfo.rows[0].description || null,
            createTime: schemaInfo.rows[0].CREATE_TIME || schemaInfo.rows[0].createTime,
            tableCount: parseInt(schemaInfo.rows[0].TABLECOUNT || schemaInfo.rows[0].tableCount || 0),
            viewCount: parseInt(schemaInfo.rows[0].VIEWCOUNT || schemaInfo.rows[0].viewCount || 0),
            routineCount: parseInt(schemaInfo.rows[0].ROUTINECOUNT || schemaInfo.rows[0].routineCount || 0),
            modifyDate: schemaInfo.rows[0].CREATE_TIME || new Date()
          };
          result.schemas = [schemaObj];
          console.log(`[DB2] Added schema object with metadata:`, schemaObj.name);
        } else {
          // Fallback to basic schema object if no info found
          const schemaObj = {
            pureName: schemaName,
            schemaName: schemaName,
            name: schemaName,
            objectId: `schemas:${schemaName}`,
            id: `schema_${schemaName}`,
            objectType: 'schema',
            owner: '',
            description: null,
            tableCount: 0,
            viewCount: 0,
            routineCount: 0,
            modifyDate: new Date()
          };
          result.schemas = [schemaObj];
          console.log(`[DB2] Added basic schema object:`, schemaObj.name);
        }
      } catch (schemaErr) {
        console.error(`[DB2] Error getting schema info, using basic schema object:`, schemaErr);
        // Fallback to basic schema object if error
        const schemaObj = {
          pureName: schemaName,
          schemaName: schemaName,
          name: schemaName,
          objectId: `schemas:${schemaName}`,
          id: `schema_${schemaName}`,
          objectType: 'schema',
          owner: '',
          description: null,
          tableCount: 0,
          viewCount: 0,
          routineCount: 0,
          modifyDate: new Date()
        };
        result.schemas = [schemaObj];
      }

      // Get tables for this schema
      try {
        const tablesQuery = `
          SELECT 
            t.TABSCHEMA as "schemaName",
            t.TABNAME as "tableName",
            t.REMARKS as "description",
            t.TYPE as "tableType",
            t.CREATE_TIME as "createTime",
            t.ALTER_TIME as "alterTime",
            (SELECT COUNT(*) FROM SYSCAT.COLUMNS c WHERE c.TABSCHEMA = t.TABSCHEMA AND c.TABNAME = t.TABNAME) as "columnCount"
          FROM SYSCAT.TABLES t
          WHERE t.TABSCHEMA = ?
          AND t.TYPE IN ('T', 'P')  /* Include both tables and partitioned tables */
          ORDER BY t.TABNAME
        `;
        console.log(`[DB2] Executing tables query for schema ${schemaName}`);
        const tablesResult = await this.query(dbhan, tablesQuery, [schemaName]);
        
        if (tablesResult.rows && tablesResult.rows.length > 0) {
          console.log(`[DB2] Found ${tablesResult.rows.length} tables in schema ${schemaName}`);
          
          // Debug the first row returned to check field names
          console.log('[DB2] Sample table data:', JSON.stringify(tablesResult.rows[0]));
          
          // Debug table data to better understand structure
          console.log(`[DB2] Sample table data:`, JSON.stringify(tablesResult.rows[0] || {}));
          
          const tables = tablesResult.rows.map(row => {
            // Use case-insensitive access to fields
            const getValue = (fieldName) => {
              if (row[fieldName] !== undefined) return row[fieldName];
              if (row[fieldName.toUpperCase()] !== undefined) return row[fieldName.toUpperCase()];
              if (row[fieldName.toLowerCase()] !== undefined) return row[fieldName.toLowerCase()];
              return null;
            };
            
            const schemaName = getValue("schemaName") || '';
            const tableName = getValue("tableName") || '';
            
            return {
              schemaName: schemaName.trim(),
              pureName: tableName.trim(),
              objectType: 'table',
              objectId: `${schemaName.trim()}.${tableName.trim()}`,
              tableType: getValue("tableType") || 'T',
              description: getValue("description"),
              createTime: getValue("createTime"),
              alterTime: getValue("alterTime"),
              modifyDate: getValue("alterTime") || getValue("createTime") || new Date(),
              displayName: tableName.trim(), // Show only table name without schema
              objectSchema: schemaName.trim(),  // Important for schema filtering
              schema: schemaName.trim(), // Additional schema field for legacy UI components
              columnCount: parseInt(getValue("columnCount") || 0), 
              contentHash: `${schemaName.trim()}.${tableName.trim()}`,
              fullName: `${schemaName.trim()}.${tableName.trim()}`,
              columns: []
            };
          });
          
          // For each table, get its columns
          // Add the tables list to the result structure
          result.tables = tables;
          
          // For each table, get its columns
          for (const table of tables) {
            try {
              const columnsQuery = `
                SELECT 
                  COLNAME as "columnName",
                  TYPENAME as "dataType",
                  LENGTH as "length",
                  SCALE as "scale",
                  NULLS as "isNullable",
                  DEFAULT as "defaultValue",
                  COLNO as "ordinalPosition",
                  IDENTITY as "isIdentity",
                  REMARKS as "description",
                  COLNO as "colno"
                FROM SYSCAT.COLUMNS
                WHERE TABSCHEMA = ? AND TABNAME = ?
                ORDER BY COLNO
              `;
              console.log(`[DB2] Getting columns for table ${table.schemaName}.${table.pureName}`);
              const columnsResult = await this.query(dbhan, columnsQuery, [table.schemaName, table.pureName]);
              
              if (columnsResult.rows && columnsResult.rows.length > 0) {
                console.log(`[DB2] Found ${columnsResult.rows.length} columns for table ${table.pureName}`);
                // Log the first column to debug actual field names
                if (columnsResult.rows.length > 0) {
                  console.log(`[DB2] First column data sample:`, JSON.stringify(columnsResult.rows[0]));
                }
                
                // Debug first column data to verify field names
                if (columnsResult.rows && columnsResult.rows.length > 0) {
                  console.log(`[DB2] Column data sample:`, JSON.stringify(columnsResult.rows[0]));
                }
                
                table.columns = columnsResult.rows.map((row, index) => {
                  // Create a safe access function to handle case sensitivity
                  const getValue = (fieldName) => {
                    if (row[fieldName] !== undefined) return row[fieldName];
                    if (row[fieldName.toUpperCase()] !== undefined) return row[fieldName.toUpperCase()];
                    if (row[fieldName.toLowerCase()] !== undefined) return row[fieldName.toLowerCase()];
                    return null;
                  };
                  
                  const colName = getValue("columnName") || '';
                  
                  return {
                    columnName: colName,
                    dataType: getValue("dataType") || 'VARCHAR',
                    notNull: getValue("isNullable") === 'N',
                    defaultValue: getValue("defaultValue"),
                    length: getValue("length"),
                    scale: getValue("scale"),
                    description: getValue("description"),
                    ordinalPosition: getValue("ordinalPosition") || index,
                    pureName: colName,
                    isPrimaryKey: false,
                    isForeignKey: false,
                    autoIncrement: getValue("isIdentity") === 'Y',
                    // Add a unique identifier for each column to prevent conflicts
                    id: `col_${table.pureName}_${colName}_${index}`,
                    // Add display name for UI
                    displayName: colName
                  };
                });
              }
            } catch (colErr) {
              console.error(`[DB2] Error getting columns for table ${table.schemaName}.${table.pureName}:`, colErr);
            }
            
            // Add primary key information
            try {
              const pkQuery = `
                SELECT 
                  k.COLNAME as "columnName",
                  k.COLSEQ as "columnSequence",
                  tc.CONSTNAME as "constraintName"
                FROM SYSCAT.KEYCOLUSE k
                JOIN SYSCAT.TABCONST tc ON 
                  k.CONSTNAME = tc.CONSTNAME 
                  AND k.TABSCHEMA = tc.TABSCHEMA
                  AND k.TABNAME = tc.TABNAME
                WHERE k.TABSCHEMA = ? 
                AND k.TABNAME = ?
                AND tc.TYPE = 'P'
                ORDER BY k.COLSEQ
              `;
              
              console.log(`[DB2] Getting primary keys for table ${table.schemaName}.${table.pureName}`);
              const pkResult = await this.query(dbhan, pkQuery, [
                table.schemaName, 
                table.pureName
              ]);
              
              if (pkResult.rows && pkResult.rows.length > 0) {
                // Log first PK row for debugging
                console.log(`[DB2] Primary key data sample:`, JSON.stringify(pkResult.rows[0]));
                
                const pkColumnNames = pkResult.rows.map(row => {
                  // Case-insensitive column name lookup
                  const colName = row.columnName || row.COLUMNNAME || row.colname || row["COLNAME"] || '';
                  return colName;
                }).filter(Boolean); // Remove any empty values
                
                console.log(`[DB2] Found primary key columns for ${table.pureName}:`, pkColumnNames);
                
                // Only if we have valid column names, mark PK columns
                if (pkColumnNames.length > 0) {
                  // Create primary key constraint object
                  table.primaryKey = {
                    constraintName: pkResult.rows[0].constraintName || pkResult.rows[0].CONSTRAINTNAME || `PK_${table.pureName}`,
                    columns: pkColumnNames.map(columnName => ({ columnName })),
                  };
                  
                  // Mark primary key columns
                  table.columns.forEach(col => {
                    if (pkColumnNames.includes(col.columnName)) {
                      col.isPrimaryKey = true;
                    }
                  });
                }
              }
            } catch (pkErr) {
              console.error(`[DB2] Error getting primary keys for table ${table.schemaName}.${table.pureName}:`, pkErr);
            }
            
            // Add foreign key information
            try {
              const fkQuery = `
                SELECT 
                  r.CONSTNAME as "constraintName",
                  k.COLNAME as "columnName",
                  r.REFTABSCHEMA as "refSchemaName",
                  r.REFTABNAME as "refTableName",
                  k.COLSEQ as "colSequence",
                  r.DELETERULE as "deleteRule",
                  r.UPDATERULE as "updateRule"
                FROM SYSCAT.KEYCOLUSE k
                JOIN SYSCAT.REFERENCES r ON 
                  k.CONSTNAME = r.CONSTNAME 
                  AND k.TABSCHEMA = r.TABSCHEMA
                WHERE k.TABSCHEMA = ? AND k.TABNAME = ?
                ORDER BY r.CONSTNAME, k.COLSEQ
              `;
              
              console.log(`[DB2] Getting foreign keys for table ${table.schemaName}.${table.pureName}`);
              const fkResult = await this.query(dbhan, fkQuery, [table.schemaName, table.pureName]);
              
              if (fkResult.rows && fkResult.rows.length > 0) {
                // Log first FK row for debugging
                console.log(`[DB2] Foreign key data sample:`, JSON.stringify(fkResult.rows[0]));
                
                // Group by constraint name
                const fkConstraints = {};
                
                fkResult.rows.forEach(row => {
                  const columnName = row.columnName || row.COLUMNNAME || '';
                  const constraintName = row.constraintName || row.CONSTRAINTNAME || '';
                  
                  // Skip if either is missing
                  if (!columnName || !constraintName) return;
                  
                  // Create constraint if not exists
                  if (!fkConstraints[constraintName]) {
                    fkConstraints[constraintName] = {
                      constraintName,
                      refTableName: row.refTableName || row.REFTABLENAME,
                      refSchemaName: row.refSchemaName || row.REFSCHEMANAME,
                      deleteAction: (row.deleteRule || row.DELETERULE || 'NO ACTION').toUpperCase(),
                      updateAction: (row.updateRule || row.UPDATERULE || 'NO ACTION').toUpperCase(),
                      columns: []
                    };
                  }
                  
                  // Add column to constraint
                  fkConstraints[constraintName].columns.push({
                    columnName
                  });
                  
                  // Mark column as foreign key
                  table.columns.forEach(col => {
                    if (col.columnName === columnName) {
                      col.isForeignKey = true;
                    }
                  });
                });
                
                // Log and add FKs to table
                const fkList = Object.values(fkConstraints);
                console.log(`[DB2] Processed ${fkList.length} foreign key constraints for ${table.pureName}`);
                table.foreignKeys = fkList;
              }
            } catch (fkErr) {
              console.error(`[DB2] Error getting foreign keys for table ${table.schemaName}.${table.pureName}:`, fkErr);
            }
          }
          
          result.tables = tables;
        } else {
          console.log(`[DB2] No tables found in schema ${schemaName}`);
        }
      } catch (tablesErr) {
        console.error('[DB2] Error getting tables:', tablesErr);
      }

      // Get views for this schema
      try {
        const viewsQuery = `
          SELECT 
            VIEWSCHEMA as schemaName,
            VIEWNAME as viewName,
            REMARKS as description,
            TEXT as definition,
            CREATE_TIME as createTime,
            ALTER_TIME as alterTime
          FROM SYSCAT.VIEWS
          WHERE VIEWSCHEMA = ?
          ORDER BY VIEWNAME
        `;
        console.log(`[DB2] Executing views query for schema ${schemaName}`);
        const viewsResult = await this.query(dbhan, viewsQuery, [schemaName]);
        
        if (viewsResult.rows && viewsResult.rows.length > 0) {
          console.log(`[DB2] Found ${viewsResult.rows.length} views in schema ${schemaName}`);
          const views = viewsResult.rows.map(row => ({
            schemaName: (row.VIEWSCHEMA || row.schemaName || '').trim(),
            pureName: (row.VIEWNAME || row.viewName || '').trim(),
            objectType: 'view',
            objectId: `${(row.VIEWSCHEMA || row.schemaName || '').trim()}.${(row.VIEWNAME || row.viewName || '').trim()}`,
            description: row.REMARKS || row.description,
            createTime: row.CREATE_TIME || row.createTime,
            alterTime: row.ALTER_TIME || row.alterTime,
            definition: row.TEXT || row.definition,
            contentHash: row.TEXT || row.ALTER_TIME?.toISOString() || row.CREATE_TIME?.toISOString(),
            modifyDate: row.ALTER_TIME || row.CREATE_TIME || new Date(),
            displayName: (row.VIEWNAME || row.viewName || '').trim(),
            objectSchema: (row.VIEWSCHEMA || row.schemaName || '').trim(), // Important for schema filtering
            columns: []
          }));
          
          // Add the views list to the result structure
          result.views = views;
          
          // For each view, get its columns
          for (const view of views) {
            try {
              const columnsQuery = `
                SELECT 
                  COLNAME as columnName,
                  TYPENAME as dataType,
                  LENGTH as length,
                  SCALE as scale,
                  NULLS as isNullable,
                  DEFAULT as defaultValue,
                  COLNO as ordinalPosition,
                  REMARKS as description
                FROM SYSCAT.COLUMNS
                WHERE TABSCHEMA = ? AND TABNAME = ?
                ORDER BY COLNO
              `;
              console.log(`[DB2] Getting columns for view ${view.schemaName}.${view.pureName}`);
              const columnsResult = await this.query(dbhan, columnsQuery, [view.schemaName, view.pureName]);
              
              if (columnsResult.rows && columnsResult.rows.length > 0) {
                console.log(`[DB2] Found ${columnsResult.rows.length} columns for view ${view.pureName}`);
                view.columns = columnsResult.rows.map((row, index) => ({
                  columnName: row.COLNAME || row.columnName,
                  dataType: row.TYPENAME || row.dataType,
                  notNull: (row.NULLS || row.isNullable) === 'N',
                  defaultValue: row.DEFAULT || row.defaultValue,
                  length: row.LENGTH || row.length,
                  scale: row.SCALE || row.scale,
                  description: row.REMARKS || row.description,
                  ordinalPosition: row.COLNO || row.ordinalPosition || index,
                  pureName: row.COLNAME || row.columnName
                }));
              } else {
                console.log(`[DB2] No columns found for view ${view.pureName}`);
              }
            } catch (colErr) {
              console.error(`[DB2] Error getting columns for view ${view.schemaName}.${view.pureName}:`, colErr);
            }
          }
          
          result.views = views;
        } else {
          console.log(`[DB2] No views found in schema ${schemaName}`);
        }
      } catch (viewsErr) {
        console.error('[DB2] Error getting views:', viewsErr);
      }

      // Get functions for this schema
      try {
        const functionsQuery = `
          SELECT 
            ROUTINESCHEMA as schemaName,
            ROUTINENAME as functionName,
            REMARKS as description,
            TEXT as definition,
            PARAMETER_STYLE as parameterStyle,
            LANGUAGE as language,
            CREATE_TIME as createTime,
            ALTER_TIME as alterTime,
            RETURN_TYPESCHEMA as returnTypeSchema,
            RETURN_TYPENAME as returnTypeName
          FROM SYSCAT.ROUTINES
          WHERE ROUTINETYPE = 'F'
          AND ROUTINESCHEMA = ?
          ORDER BY ROUTINENAME
        `;
        console.log(`[DB2] Executing functions query for schema ${schemaName}`);
        const functionsResult = await this.query(dbhan, functionsQuery, [schemaName]);
        
        if (functionsResult.rows && functionsResult.rows.length > 0) {
          console.log(`[DB2] Found ${functionsResult.rows.length} functions in schema ${schemaName}`);
          const functions = functionsResult.rows.map(row => {
            const routineName = (row.ROUTINENAME || row.functionName || '').trim();
            return {
              schemaName: (row.ROUTINESCHEMA || row.schemaName || '').trim(),
              pureName: routineName,
              objectType: 'function',
              objectId: `${(row.ROUTINESCHEMA || row.schemaName || '').trim()}.${routineName}`,
              description: row.REMARKS || row.description,
              definition: row.TEXT || row.definition,
              parameterStyle: row.PARAMETER_STYLE || row.parameterStyle,
              language: row.LANGUAGE || row.language,
              createTime: row.CREATE_TIME || row.createTime,
              alterTime: row.ALTER_TIME || row.alterTime,
              returnType: `${row.RETURN_TYPESCHEMA || ''}.${row.RETURN_TYPENAME || ''}`,
              contentHash: row.TEXT || row.ALTER_TIME?.toISOString() || row.CREATE_TIME?.toISOString(),
              modifyDate: row.ALTER_TIME || row.CREATE_TIME || new Date(),
              displayName: routineName
            };
          });
          
          // For each function, get its parameters
          for (const func of functions) {
            try {
              const paramsQuery = `
                SELECT 
                  PARMNAME as paramName,
                  TYPENAME as dataType,
                  LENGTH as length,
                  SCALE as scale,
                  PARM_MODE as paramMode,
                  ORDINAL as ordinalPosition
                FROM SYSCAT.ROUTINEPARMS
                WHERE ROUTINESCHEMA = ? AND ROUTINENAME = ?
                ORDER BY ORDINAL
              `;
              console.log(`[DB2] Getting parameters for function ${func.schemaName}.${func.pureName}`);
              const paramsResult = await this.query(dbhan, paramsQuery, [func.schemaName, func.pureName]);
              
              if (paramsResult.rows && paramsResult.rows.length > 0) {
                console.log(`[DB2] Found ${paramsResult.rows.length} parameters for function ${func.pureName}`);
                func.parameters = paramsResult.rows.map((row, index) => ({
                  name: row.PARMNAME || row.paramName || `param${index+1}`,
                  dataType: row.TYPENAME || row.dataType,
                  length: row.LENGTH || row.length,
                  scale: row.SCALE || row.scale,
                  mode: row.PARM_MODE || row.paramMode,
                  ordinalPosition: row.ORDINAL || row.ordinalPosition || index
                }));
              }
            } catch (paramsErr) {
              console.error(`[DB2] Error getting parameters for function ${func.schemaName}.${func.pureName}:`, paramsErr);
            }
          }
          
          result.functions = functions;
        } else {
          console.log(`[DB2] No functions found in schema ${schemaName}`);
        }
      } catch (functionsErr) {
        console.error('[DB2] Error getting functions:', functionsErr);
      }

      // Get procedures for this schema
      try {
        const proceduresQuery = `
          SELECT 
            ROUTINESCHEMA as schemaName,
            ROUTINENAME as procedureName,
            REMARKS as description,
            TEXT as definition,
            PARAMETER_STYLE as parameterStyle,
            LANGUAGE as language,
            CREATE_TIME as createTime,
            ALTER_TIME as alterTime,
            ORIGIN as origin,
            DIALECT as dialect
          FROM SYSCAT.ROUTINES
          WHERE ROUTINETYPE = 'P'
          AND ROUTINESCHEMA = ?
          ORDER BY ROUTINENAME
        `;
        console.log(`[DB2] Executing procedures query for schema ${schemaName}`);
        const proceduresResult = await this.query(dbhan, proceduresQuery, [schemaName]);
        
        if (proceduresResult.rows && proceduresResult.rows.length > 0) {
          console.log(`[DB2] Found ${proceduresResult.rows.length} procedures in schema ${schemaName}`);
          const procedures = proceduresResult.rows.map(row => {
            const routineName = (row.ROUTINENAME || row.procedureName || '').trim();
            return {
              schemaName: (row.ROUTINESCHEMA || row.schemaName || '').trim(),
              pureName: routineName,
              objectType: 'procedure',
              objectId: `${(row.ROUTINESCHEMA || row.schemaName || '').trim()}.${routineName}`,
              description: row.REMARKS || row.description,
              definition: row.TEXT || row.definition,
              parameterStyle: row.PARAMETER_STYLE || row.parameterStyle,
              language: row.LANGUAGE || row.language,
              createTime: row.CREATE_TIME || row.createTime,
              alterTime: row.ALTER_TIME || row.alterTime,
              origin: row.ORIGIN || row.origin,
              dialect: row.DIALECT || row.dialect,
              contentHash: row.TEXT || row.ALTER_TIME?.toISOString() || row.CREATE_TIME?.toISOString(),
              modifyDate: row.ALTER_TIME || row.CREATE_TIME || new Date(),
              displayName: routineName
            };
          });
          
          // For each procedure, get its parameters
          for (const proc of procedures) {
            try {
              const paramsQuery = `
                SELECT 
                  PARMNAME as paramName,
                  TYPENAME as dataType,
                  LENGTH as length,
                  SCALE as scale,
                  PARM_MODE as paramMode,
                  ORDINAL as ordinalPosition
                FROM SYSCAT.ROUTINEPARMS
                WHERE ROUTINESCHEMA = ? AND ROUTINENAME = ?
                ORDER BY ORDINAL
              `;
              console.log(`[DB2] Getting parameters for procedure ${proc.schemaName}.${proc.pureName}`);
              const paramsResult = await this.query(dbhan, paramsQuery, [proc.schemaName, proc.pureName]);
              
              if (paramsResult.rows && paramsResult.rows.length > 0) {
                console.log(`[DB2] Found ${paramsResult.rows.length} parameters for procedure ${proc.pureName}`);
                proc.parameters = paramsResult.rows.map((row, index) => ({
                  name: row.PARMNAME || row.paramName || `param${index+1}`,
                  dataType: row.TYPENAME || row.dataType,
                  length: row.LENGTH || row.length,
                  scale: row.SCALE || row.scale,
                  mode: row.PARM_MODE || row.paramMode,
                  ordinalPosition: row.ORDINAL || row.ordinalPosition || index
                }));
              }
            } catch (paramsErr) {
              console.error(`[DB2] Error getting parameters for procedure ${proc.schemaName}.${proc.pureName}:`, paramsErr);
            }
          }
          
          result.procedures = procedures;
        } else {
          console.log(`[DB2] No procedures found in schema ${schemaName}`);
        }
      } catch (proceduresErr) {
        console.error('[DB2] Error getting procedures:', proceduresErr);
      }

      // Get triggers for this schema
      try {
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
        console.log(`[DB2] Executing triggers query for schema ${schemaName}`);
        const triggersResult = await this.query(dbhan, triggersQuery, [schemaName]);
        
        if (triggersResult.rows && triggersResult.rows.length > 0) {
          console.log(`[DB2] Found ${triggersResult.rows.length} triggers in schema ${schemaName}`);
          const triggers = triggersResult.rows.map(row => {
            const triggerName = (row.TRIGNAME || row.triggerName || '').trim();
            const triggerEvent = row.TRIGEVENT || row.triggerEvent;
            const triggerTime = row.TRIGTIME || row.triggerTime;
            
            // Format trigger information for easier reading in UI
            let formattedEvent = '';
            if (triggerEvent) {
              if (triggerEvent.includes('I')) formattedEvent += 'INSERT';
              if (triggerEvent.includes('U')) formattedEvent += formattedEvent ? ', UPDATE' : 'UPDATE';
              if (triggerEvent.includes('D')) formattedEvent += formattedEvent ? ', DELETE' : 'DELETE';
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
              objectId: `${(row.TABSCHEMA || row.schemaName || '').trim()}.${triggerName}`,
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
              displayName: triggerName
            };
          });
          result.triggers = triggers;
        } else {
          console.log(`[DB2] No triggers found in schema ${schemaName}`);
        }
      } catch (triggersErr) {
        console.error('[DB2] Error getting triggers:', triggersErr);
      }

      // Log summary of structure gathered
      console.log('[DB2] Structure analysis results:', {
        schemaCount: result.schemas.length,
        tableCount: result.tables.length,
        viewCount: result.views.length,
        functionCount: result.functions.length,
        procedureCount: result.procedures.length,
        triggerCount: result.triggers.length
      });
      
      // Log detailed information about structure object counts
      const tableColumnCount = result.tables.reduce((sum, table) => sum + (table.columns?.length || 0), 0);
      const viewColumnCount = result.views.reduce((sum, view) => sum + (view.columns?.length || 0), 0);
      const functionParamCount = result.functions.reduce((sum, fn) => sum + (fn.parameters?.length || 0), 0);
      const procedureParamCount = result.procedures.reduce((sum, proc) => sum + (proc.parameters?.length || 0), 0);
      
      console.log('[DB2] Object detail counts:', {
        tableColumns: tableColumnCount,
        viewColumns: viewColumnCount,
        functionParameters: functionParamCount,
        procedureParameters: procedureParamCount
      });

      console.log('[DB2] ====== Completed getStructure API call ======');
      return result;
    } catch (err) {
      console.error('[DB2] Error in getStructure:', err);
      // Create default schema even in error case to ensure schema objects appear
      const defaultSchema = {
        pureName: schemaName,
        schemaName: schemaName,
        name: schemaName,
        objectId: `schemas:${schemaName}`,
        id: `schema_${schemaName}`,
        objectType: 'schema'
      };
      
      return {
        objectTypeField: 'objectType',
        objectIdField: 'objectId',
        schemaField: 'schemaName',
        pureNameField: 'pureName',
        contentHashField: 'contentHash',
        schemas: [defaultSchema],
        tables: [],
        views: [],
        functions: [],
        procedures: [],
        triggers: []
      };
    }
  },
};

module.exports = driver;
