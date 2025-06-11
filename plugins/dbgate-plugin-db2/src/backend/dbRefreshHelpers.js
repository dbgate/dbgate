/**
 * Helper functions for refreshing DB2 metadata
 */

async function refreshSchemaCounts(driver, dbhan, connectionId, schemas) {
  try {
    console.log(`[DB2] Refreshing schema counts in background for connection ${connectionId}`);
    
    if (!schemas || schemas.length === 0) {
      console.log('[DB2] No schemas to refresh counts for');
      return;
    }
    
    // Extract all schema names
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
    
    const tableCountResults = await driver.query(dbhan, tablesCountQuery, schemaNames);
    
    // Get view counts
    const viewsCountQuery = `
      SELECT 
        VIEWSCHEMA as "schemaName",
        COUNT(*) as "viewCount"
      FROM SYSCAT.VIEWS
      WHERE VIEWSCHEMA IN (${schemaPlaceholders})
      GROUP BY VIEWSCHEMA
    `;
    
    const viewCountResults = await driver.query(dbhan, viewsCountQuery, schemaNames);
    
    // Get routine counts (procedures and functions)
    const routinesCountQuery = `
      SELECT 
        ROUTINESCHEMA as "schemaName",
        COUNT(*) as "routineCount"
      FROM SYSCAT.ROUTINES
      WHERE ROUTINESCHEMA IN (${schemaPlaceholders})
      GROUP BY ROUTINESCHEMA
    `;
    
    const routineCountResults = await driver.query(dbhan, routinesCountQuery, schemaNames);
    
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
    schemas = schemas.map(schema => ({
      ...schema,
      tableCount: parseInt(schema.tableCount || 0),
      viewCount: parseInt(schema.viewCount || 0),
      routineCount: parseInt(schema.routineCount || 0)
    }));
    
    console.log('[DB2] Schema counts refreshed successfully');
    
    // Update the cache with the new counts
    if (dbhan._connectionParams?.useCaching && driver.cacheManager) {
      driver.cacheManager.setSchemaCache(connectionId, schemas);
      console.log('[DB2] Updated schema cache with refreshed counts');
    }
    
    return schemas;
  } catch (err) {
    console.error('[DB2] Error refreshing schema counts:', err);
    return schemas;
  }
}

module.exports = {
  refreshSchemaCounts
};
