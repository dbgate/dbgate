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

function findView(dbinfo, schemaName, pureName) {
  const views = [...(dbinfo?.views || []), ...(dbinfo?.matviews || [])];
  if (!views.length || !pureName) return null;
  if (schemaName) {
    return views.find(view => view.schemaName == schemaName && view.pureName == pureName);
  }
  const matchingViews = views.filter(view => view.pureName == pureName);
  return matchingViews.length == 1 ? matchingViews[0] : null;
}

function extractSelectFromCreateView(createSql) {
  if (!createSql) return null;
  const match = createSql.match(/\bas\s+(select\b[\s\S]*)/i);
  return match ? match[1] : createSql;
}

function resolveViewResultColumns(columns, dbinfo) {
  if (!columns?.length) return columns;
  if (!dbinfo?.views?.length && !dbinfo?.matviews?.length) return columns;

  return columns.map(column => {
    const view = findView(dbinfo, column.tableSchema, column.tableName);
    if (!view?.createSql) return column;

    const columnMetadata = extractColumnMetadataFromSql(extractSelectFromCreateView(view.createSql));
    const metadata = getColumnMetadata(columnMetadata, column.columnName);
    if (!metadata) return column;

    return {
      ...column,
      tableName: metadata.tableName,
      tableSchema: metadata.schemaName,
      sourceColumnName: metadata.sourceColumnName,
    };
  });
}

async function enrichQueryResultColumns({ columns, sql, driver, dbhan, dbinfo, onNativeMetadataError, onFallbackMetadataError }) {
  if (!columns?.length || !driver?.databaseEngineTypes?.includes('sql') || !driver?.supportsEditableQueryResults) {
    return columns;
  }

  if (driver.enrichColumnMetadata) {
    try {
      const enriched = resolveViewResultColumns(await driver.enrichColumnMetadata(dbhan, sql, columns, dbinfo), dbinfo);
      if (enriched?.every(column => column.tableName && column.sourceColumnName)) return enriched;
      if (enriched?.length == columns.length) columns = enriched;
    } catch (err) {
      onNativeMetadataError?.(err);
    }
  }

  try {
    const columnMetadata = extractColumnMetadataFromSql(sql);
    if (columnMetadata) {
      return resolveViewResultColumns(columns.map(column => {
        const metadata = getColumnMetadata(columnMetadata, column.columnName);
        return {
          ...column,
          tableName: column.tableName || metadata?.tableName,
          tableSchema: column.tableSchema || metadata?.schemaName,
          sourceColumnName: column.sourceColumnName || metadata?.sourceColumnName,
        };
      }), dbinfo);
    }

    const table = extractSingleTableFromSql(sql);
    if (!table) return columns;
    const columnSources = extractColumnSourcesFromSql(sql);

    return resolveViewResultColumns(columns.map(column => ({
      ...column,
      tableName: column.tableName || table.tableName,
      tableSchema: column.tableSchema || table.schemaName,
      sourceColumnName: column.sourceColumnName || getColumnSourceName(columnSources, column.columnName) || column.columnName,
    })), dbinfo);
  } catch (err) {
    onFallbackMetadataError?.(err);
    return columns;
  }
}

module.exports = {
  enrichQueryResultColumns,
};
