/**
 * Helper functions for DB2 schema operations
 */

/**
 * Refreshes schema counts in the background to avoid blocking the UI
 * @param {Object} driver - The DB2 driver instance
 * @param {Object} dbhan - Database connection handle
 * @param {string} connectionId - Connection ID for caching
 * @param {Array} schemas - Array of schemas to refresh counts for
 * @returns {Promise<Array>} - Updated schemas array
 */
async function refreshSchemaCounts(driver, dbhan, connectionId, schemas) {
  try {
    console.log(`[DB2] Refreshing schema counts in background for connection ${connectionId}`);
    
    if (!schemas || schemas.length === 0) {
      console.log('[DB2] No schemas to refresh counts for');
      return schemas;
    }
    
    // Extract all schema names for the query
    const schemaNames = schemas.map(s => s.schemaName).filter(Boolean);
    
    if (schemaNames.length === 0) {
      console.log('[DB2] No valid schema names to refresh counts for');
      return schemas;
    }
    
    // Create the query with IN clause - safer approach for schema names with special characters
    let tableCountsBySchema = {};
    let viewCountsBySchema = {};
    let routineCountsBySchema = {};
    
    // Get table counts for each schema
    for (const schemaName of schemaNames) {
      try {
        const tableQuery = `
          SELECT COUNT(*) as count 
          FROM SYSCAT.TABLES 
          WHERE TABSCHEMA = ? AND TYPE IN ('T', 'P')
        `;
        const tableRes = await driver.query(dbhan, tableQuery, [schemaName]);
        if (tableRes && tableRes.rows && tableRes.rows.length > 0) {
          const count = parseInt(tableRes.rows[0].COUNT || tableRes.rows[0].count || 0);
          tableCountsBySchema[schemaName] = count;
        }
      } catch (err) {
        console.error(`[DB2] Error getting table count for schema ${schemaName}:`, err.message);
        tableCountsBySchema[schemaName] = 0;
      }
      
      // Get view counts
      try {
        const viewQuery = `
          SELECT COUNT(*) as count 
          FROM SYSCAT.VIEWS 
          WHERE VIEWSCHEMA = ?
        `;
        const viewRes = await driver.query(dbhan, viewQuery, [schemaName]);
        if (viewRes && viewRes.rows && viewRes.rows.length > 0) {
          const count = parseInt(viewRes.rows[0].COUNT || viewRes.rows[0].count || 0);
          viewCountsBySchema[schemaName] = count;
        }
      } catch (err) {
        console.error(`[DB2] Error getting view count for schema ${schemaName}:`, err.message);
        viewCountsBySchema[schemaName] = 0;
      }
      
      // Get routine counts
      try {
        const routineQuery = `
          SELECT COUNT(*) as count 
          FROM SYSCAT.ROUTINES 
          WHERE ROUTINESCHEMA = ?
        `;
        const routineRes = await driver.query(dbhan, routineQuery, [schemaName]);
        if (routineRes && routineRes.rows && routineRes.rows.length > 0) {
          const count = parseInt(routineRes.rows[0].COUNT || routineRes.rows[0].count || 0);
          routineCountsBySchema[schemaName] = count;
        }
      } catch (err) {
        console.error(`[DB2] Error getting routine count for schema ${schemaName}:`, err.message);
        routineCountsBySchema[schemaName] = 0;
      }
    }
    
    // Update schema objects with the retrieved counts
    schemas.forEach(schema => {
      const schemaName = schema.schemaName || schema.name;
      if (schemaName) {
        schema.tableCount = tableCountsBySchema[schemaName] || 0;
        schema.viewCount = viewCountsBySchema[schemaName] || 0;
        schema.routineCount = routineCountsBySchema[schemaName] || 0;
      }
    });
    
    console.log('[DB2] Successfully refreshed schema counts');
    
    // Update the cache with refreshed counts
    if (driver.cacheManager && typeof driver.cacheManager.setSchemaCache === 'function') {
      console.log('[DB2] Updating schema cache with refreshed counts');
      driver.cacheManager.setSchemaCache(connectionId, schemas);
    } else if (global.cacheManager && typeof global.cacheManager.setSchemaCache === 'function') {
      console.log('[DB2] Updating global schema cache with refreshed counts');
      global.cacheManager.setSchemaCache(connectionId, schemas);
    }
    
    return schemas;
  } catch (err) {
    console.error('[DB2] Error in refreshSchemaCounts:', err);
    return schemas;  // Return original schemas to prevent data loss
  }
}

module.exports = {
  refreshSchemaCounts
};
