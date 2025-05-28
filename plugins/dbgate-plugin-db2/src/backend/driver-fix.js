// Helper function to fix the driver without modifying the original file directly
const fixDriverIssues = (driver) => {
  if (!driver) return;
  
  console.log('[DB2] Applying fixes to DB2 driver to prevent errors');
  
  // Fix the _detectQueryType method that's causing errors
  driver._detectQueryType = function(sql) {
    try {
      // Safety check - if sql is not a string, return DEFAULT
      if (typeof sql !== 'string') {
        console.warn('[DB2] Non-string SQL passed to _detectQueryType:', typeof sql);
        return 'DEFAULT';
      }
      
      if (!sql || sql.trim() === '') {
        console.warn('[DB2] Empty SQL passed to _detectQueryType');
        return 'DEFAULT';
      }
      
      // Safely convert to lowercase
      const sqlLower = sql.toLowerCase();
      
      // Use regex pattern matching for more reliable type detection
      if (sqlLower.match(/sysibm\.sysdummy1/i) && !sqlLower.match(/\bjoin\b/i)) {
        return 'CHECK_CONNECTION';
      } else if (sqlLower.match(/syscat\.schemata/i)) {
        return 'SCHEMA_LIST';
      } else if (sqlLower.match(/syscat\.tables|sysibm\.systables/i)) {
        return 'TABLE_LIST';
      } else if (sqlLower.match(/syscat\.columns|sysibm\.syscolumns/i)) {
        return 'COLUMN_DETAILS';
      } else if (sqlLower.match(/syscat\.keycoluse|syscat\.references/i)) {
        return 'CONSTRAINT_DETAILS';
      } else if (sqlLower.match(/syscat\.routines/i)) {
        return 'ROUTINE_LIST';
      } else if (sqlLower.match(/syscat\.views|viewschema/i)) {
        return 'VIEW_LIST';
      } else if (sqlLower.match(/select\s+current\s+schema/i)) {
        return 'CURRENT_SCHEMA';
      } else if (sqlLower.match(/select\s+current\s+server/i)) {
        return 'SERVER_INFO';
      }
      
      // Default case
      return 'GENERAL';
    } catch (err) {
      console.error('[DB2] Error in _detectQueryType:', err.message);
      return 'DEFAULT';
    }
  };
  
  // Fix issue with query method used for sql-select endpoint
  const originalQuery = driver.query;
  if (originalQuery) {
    driver.query = async function(dbhan, sql, params = [], options = {}) {
      try {
        // Validate parameters to prevent errors
        if (dbhan === undefined || dbhan === null) {
          console.error('[DB2] Query failed: No database connection');
          return {
            rows: [],
            columns: [],
            rowCount: 0,
            error: 'No database connection',
            errorType: 'CONNECTION_ERROR'
          };
        }
        
        // Validate SQL param - convert to string if needed
        if (sql === undefined || sql === null) {
          console.warn('[DB2] Null or undefined SQL query received');
          sql = '';
        } else if (typeof sql !== 'string') {
          console.warn('[DB2] Non-string SQL query received, converting to string');
          try {
            sql = String(sql);
          } catch (err) {
            console.error('[DB2] Failed to convert SQL query to string:', err);
            sql = '';
          }
        }
        
        // Validate parameters
        if (!Array.isArray(params)) {
          console.warn('[DB2] Invalid params, using empty array');
          params = [];
        }
        
        // For empty queries, return empty results without calling the database
        if (!sql || sql.trim() === '') {
          return {
            rows: [],
            columns: [],
            rowCount: 0
          };
        }
        
        // Call the original query method
        return await originalQuery.call(this, dbhan, sql, params, options);
      } catch (err) {
        console.error('[DB2] Error in query wrapper:', err.message);
        
        // Return an error object for the client
        return {
          rows: [],
          columns: [],
          rowCount: 0,
          error: err.message,
          errorType: 'QUERY_ERROR'
        };
      }
    };
  }
  
  console.log('[DB2] Driver fixes have been applied successfully');
};

module.exports = {
  fixDriverIssues
};
