const {
  extractSingleTableFromSql,
  extractColumnSourcesFromSql,
  extractColumnMetadataFromSql,
} = require('dbgate-tools');

function getColumnSourceName(columnSources, columnName) {
  if (!columnSources || !columnName) return null;
  if (columnSources[columnName]) return columnSources[columnName];

  const matchingKeys = Object.keys(columnSources).filter(key => key.toLowerCase() == columnName.toLowerCase());
  return matchingKeys.length == 1 ? columnSources[matchingKeys[0]] : null;
}

function getColumnMetadata(columnMetadata, columnName) {
  if (!columnMetadata || !columnName) return null;
  if (columnMetadata[columnName]) return columnMetadata[columnName];

  const matchingKeys = Object.keys(columnMetadata).filter(key => key.toLowerCase() == columnName.toLowerCase());
  return matchingKeys.length == 1 ? columnMetadata[matchingKeys[0]] : null;
}

async function enrichQueryResultColumns({ columns, sql, driver, dbhan, dbinfo, onNativeMetadataError, onFallbackMetadataError }) {
  if (!columns?.length || !driver?.databaseEngineTypes?.includes('sql') || !driver?.supportsEditableQueryResults) {
    return columns;
  }

  if (driver.enrichColumnMetadata) {
    try {
      const enriched = await driver.enrichColumnMetadata(dbhan, sql, columns, dbinfo);
      if (enriched?.every(column => column.tableName && column.sourceColumnName)) return enriched;
      if (enriched?.length == columns.length) columns = enriched;
    } catch (err) {
      onNativeMetadataError?.(err);
    }
  }

  try {
    const columnMetadata = extractColumnMetadataFromSql(sql);
    if (columnMetadata) {
      return columns.map(column => {
        const metadata = getColumnMetadata(columnMetadata, column.columnName);
        return {
          ...column,
          tableName: column.tableName || metadata?.tableName,
          tableSchema: column.tableSchema || metadata?.schemaName,
          sourceColumnName: column.sourceColumnName || metadata?.sourceColumnName,
        };
      });
    }

    const table = extractSingleTableFromSql(sql);
    if (!table) return columns;
    const columnSources = extractColumnSourcesFromSql(sql);

    return columns.map(column => ({
      ...column,
      tableName: column.tableName || table.tableName,
      tableSchema: column.tableSchema || table.schemaName,
      sourceColumnName: column.sourceColumnName || getColumnSourceName(columnSources, column.columnName) || column.columnName,
    }));
  } catch (err) {
    onFallbackMetadataError?.(err);
    return columns;
  }
}

module.exports = {
  enrichQueryResultColumns,
};
