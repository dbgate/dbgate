/**
 * This file fixes the hanging issue in /database-connections/schema-list endpoint
 * and the incorrect table counts in schema dropdowns by providing an improved
 * implementation for refreshing schema counts.
 */

// Import the DB2 driver - adjust paths as needed
const driver = require('./driver');

// Add the missing method - when referenced but not defined, it was causing the hanging issue
driver._refreshSchemaCounts = async function(dbhan, connectionId, schemas) {
  try {
    console.log(`[DB2] Refreshing schema counts in background for connection ${connectionId}`);
    
    if (!schemas || schemas.length === 0) {
      console.log('[DB2] No schemas to refresh counts for');
      return schemas;
    }
    
    // Process each schema individually to avoid complex queries
    for (const schema of schemas) {
      if (!schema.schemaName) continue;
      
      try {
        // Get table count
        const tableCountQuery = `
          SELECT COUNT(*) as count 
          FROM SYSCAT.TABLES 
          WHERE TABSCHEMA = ? AND TYPE IN ('T', 'P')
        `;
        const tableResult = await this.query(dbhan, tableCountQuery, [schema.schemaName]);
        if (tableResult && tableResult.rows && tableResult.rows.length > 0) {
          const count = parseInt(tableResult.rows[0].COUNT || tableResult.rows[0].count || 0);
          schema.tableCount = isNaN(count) ? 0 : count;
        } else {
          schema.tableCount = 0;
        }
        
        // Get view count
        const viewCountQuery = `
          SELECT COUNT(*) as count 
          FROM SYSCAT.VIEWS 
          WHERE VIEWSCHEMA = ?
        `;
        const viewResult = await this.query(dbhan, viewCountQuery, [schema.schemaName]);
        if (viewResult && viewResult.rows && viewResult.rows.length > 0) {
          const count = parseInt(viewResult.rows[0].COUNT || viewResult.rows[0].count || 0);
          schema.viewCount = isNaN(count) ? 0 : count;
        } else {
          schema.viewCount = 0;
        }
        
        // Get routine count
        const routineCountQuery = `
          SELECT COUNT(*) as count 
          FROM SYSCAT.ROUTINES 
          WHERE ROUTINESCHEMA = ?
        `;
        const routineResult = await this.query(dbhan, routineCountQuery, [schema.schemaName]);
        if (routineResult && routineResult.rows && routineResult.rows.length > 0) {
          const count = parseInt(routineResult.rows[0].COUNT || routineResult.rows[0].count || 0);
          schema.routineCount = isNaN(count) ? 0 : count;
        } else {
          schema.routineCount = 0;
        }
      } catch (schemaErr) {
        console.error(`[DB2] Error getting counts for schema ${schema.schemaName}:`, schemaErr);
        // Set defaults in case of error
        schema.tableCount = schema.tableCount || 0;
        schema.viewCount = schema.viewCount || 0;
        schema.routineCount = schema.routineCount || 0;
      }
    }
    
    // Update cache with refreshed counts
    if (this.cacheManager && typeof this.cacheManager.setSchemaCache === 'function') {
      this.cacheManager.setSchemaCache(connectionId, schemas);
      console.log('[DB2] Updated schema cache with refreshed counts');
    }
    
    // Try to emit an event to refresh the UI
    try {
      const [conid, database] = connectionId.split('_');
      try {
        // Check if socket module is available
        const socket = require('../../api/src/utility/socket');
        if (socket && typeof socket.emitChanged === 'function') {
          socket.emitChanged('schema-list-changed', { conid, database });
        }
      } catch (socketErr) {
        // Socket module not found, just continue
      }
    } catch (eventErr) {
      // Ignore event emission errors
    }
    
    console.log('[DB2] Schema counts refreshed successfully');
    return schemas;
  } catch (err) {
    console.error('[DB2] Error refreshing schema counts:', err);
    return schemas;
  }
};

// Export the driver with the new method
module.exports = driver;
