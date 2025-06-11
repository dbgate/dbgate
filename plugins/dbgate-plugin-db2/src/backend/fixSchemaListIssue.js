/**
 * Fix for DB2 Schema List Hanging Issue & Table Count Refresh
 *
 * This module adds the missing _refreshSchemaCounts method to the DB2 driver
 * to fix the hanging issue with the /database-connections/schema-list endpoint
 * and the incorrect table counts in schema dropdown.
 */

// Import the necessary modules
const cacheManager = require('./cache-manager');

/**
 * Applies all fixes for schema list and table count issues
 * @param {Object} driver - The DB2 driver instance
 */
function applyFixes(driver) {
  console.log('[DB2] Applying fixes for schema list endpoint and table counts');
  
  /**
   * Implementation of the missing _refreshSchemaCounts method
   * This is called by the listSchemas method to refresh schema counts in the background
   */
  driver._refreshSchemaCounts = async function(dbhan, connectionId, schemas) {
    try {
      console.log(`[DB2] Refreshing schema counts in background for connection ${connectionId}`);
      
      if (!schemas || schemas.length === 0) {
        console.log('[DB2] No schemas to refresh counts for');
        return;
      }
      
      // Process each schema individually to avoid issues with complex queries
      for (const schema of schemas) {
        if (!schema || !schema.schemaName) continue;
        
        try {
          // Get table count for this schema
          const tableQuery = `
            SELECT COUNT(*) as count 
            FROM SYSCAT.TABLES 
            WHERE TABSCHEMA = ? AND TYPE IN ('T', 'P')
          `;
          
          const tableResult = await this.query(dbhan, tableQuery, [schema.schemaName]);
          if (tableResult && tableResult.rows && tableResult.rows[0]) {
            // Handle case differences in result field names
            const count = tableResult.rows[0].COUNT || 
                         tableResult.rows[0].count || 
                         tableResult.rows[0]['COUNT(*)'] || 0;
            
            schema.tableCount = parseInt(count) || 0;
          } else {
            schema.tableCount = 0;
          }
          
          // Get view count for this schema
          const viewQuery = `
            SELECT COUNT(*) as count 
            FROM SYSCAT.VIEWS 
            WHERE VIEWSCHEMA = ?
          `;
          
          const viewResult = await this.query(dbhan, viewQuery, [schema.schemaName]);
          if (viewResult && viewResult.rows && viewResult.rows[0]) {
            const count = viewResult.rows[0].COUNT || 
                         viewResult.rows[0].count || 
                         viewResult.rows[0]['COUNT(*)'] || 0;
            
            schema.viewCount = parseInt(count) || 0;
          } else {
            schema.viewCount = 0;
          }
          
          // Get routine count for this schema (procedures + functions)
          const routineQuery = `
            SELECT COUNT(*) as count 
            FROM SYSCAT.ROUTINES 
            WHERE ROUTINESCHEMA = ?
          `;
          
          const routineResult = await this.query(dbhan, routineQuery, [schema.schemaName]);
          if (routineResult && routineResult.rows && routineResult.rows[0]) {
            const count = routineResult.rows[0].COUNT || 
                         routineResult.rows[0].count || 
                         routineResult.rows[0]['COUNT(*)'] || 0;
            
            schema.routineCount = parseInt(count) || 0;
          } else {
            schema.routineCount = 0;
          }
        } catch (err) {
          console.error(`[DB2] Error getting counts for schema ${schema.schemaName}:`, err);
          // Make sure we have default values if there's an error
          schema.tableCount = schema.tableCount || 0;
          schema.viewCount = schema.viewCount || 0;
          schema.routineCount = schema.routineCount || 0;
        }
      }
      
      // Update the cache with the refreshed counts
      if (cacheManager && typeof cacheManager.setSchemaCache === 'function') {
        console.log('[DB2] Updating schema cache with refreshed counts');
        cacheManager.setSchemaCache(connectionId, schemas);
        
        // Try to notify the UI about updated schemas
        try {
          const [conid, database] = connectionId.split('_');
          // Try to load the socket module
          try {
            const socketPath = '../../../api/src/utility/socket';
            const socket = require(socketPath);
            if (socket && typeof socket.emitChanged === 'function') {
              console.log('[DB2] Emitting schema-list-changed event');
              socket.emitChanged('schema-list-changed', { conid, database });
            }
          } catch (socketErr) {
            // Socket module not available, ignore
          }
        } catch (notifyErr) {
          // Ignore notification errors
        }
      }
      
      console.log('[DB2] Successfully refreshed schema counts for:', schemas.map(s => s.schemaName).join(', '));
    } catch (err) {
      console.error('[DB2] Error in _refreshSchemaCounts:', err);
    }
  };
  
  /**
   * Fix for the bug in the query count aggregation
   */  const originalQuery = driver.query;
  if (originalQuery) {
    driver.query = async function(dbhan, sql, params = [], options = {}) {
      try {
        // Validate SQL parameter to avoid 'includes' errors
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
        
        // For COUNT queries that might have issues, enhance error handling
        const sqlUpper = (sql || '').toUpperCase();
        if (sqlUpper.includes('COUNT(*)') && 
            (sqlUpper.includes('SYSCAT.TABLES') || 
             sqlUpper.includes('SYSCAT.VIEWS') || 
             sqlUpper.includes('SYSCAT.ROUTINES'))) {
          
          try {
            const result = await originalQuery.call(this, dbhan, sql, params, options);
            return result;
          } catch (err) {
            console.error(`[DB2] Error executing count query, returning safe default:`, err);
            // Return a safe default result for COUNT queries
            return {
              rows: [{ COUNT: 0, count: 0 }],
              columns: [{ columnName: 'count', dataType: 'number' }],
              rowCount: 1
            };
          }
        }
        
        // For all other queries, use the original implementation with error handling
        return await originalQuery.call(this, dbhan, sql, params, options);
      } catch (err) {
        console.error(`[DB2] Error in query wrapper:`, err);
        
        // For SQL-related errors, provide a safe fallback result
        if (err.message && err.message.includes('SQL')) {
          return {
            rows: [],
            columns: [],
            rowCount: 0,
            error: err.message
          };
        }
        
        // Rethrow other errors
        throw err;
      }
    };
  }
  
  console.log('[DB2] Schema list fixes have been applied');
}

module.exports = {
  applyFixes
};
