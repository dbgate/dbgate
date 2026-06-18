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

function namesEqual(left, right) {
  return left != null && right != null && left.toLowerCase() == right.toLowerCase();
}

function findTable(dbinfo, schemaName, pureName) {
  if (!dbinfo?.tables?.length || !pureName) return null;
  const schemaMatches = table => !schemaName || namesEqual(table.schemaName, schemaName);
  const exactTables = dbinfo.tables.filter(table => schemaMatches(table) && table.pureName == pureName);
  if (exactTables.length == 1) return exactTables[0];
  const matchingTables = dbinfo.tables.filter(table => schemaMatches(table) && namesEqual(table.pureName, pureName));
  if (matchingTables.length == 1) return matchingTables[0];
  const uniqueNameTables = dbinfo.tables.filter(table => namesEqual(table.pureName, pureName));
  return uniqueNameTables.length == 1 ? uniqueNameTables[0] : null;
}

function findView(dbinfo, schemaName, pureName) {
  const views = [...(dbinfo?.views || []), ...(dbinfo?.matviews || [])];
  if (!views.length || !pureName) return null;
  if (schemaName) {
    const exactView = views.find(view => view.schemaName == schemaName && view.pureName == pureName);
    if (exactView) return exactView;
    const schemaViews = views.filter(view => namesEqual(view.schemaName, schemaName) && namesEqual(view.pureName, pureName));
    if (schemaViews.length == 1) return schemaViews[0];
    const schemaLessViews = views.filter(view => !view.schemaName && namesEqual(view.pureName, pureName));
    return schemaLessViews.length == 1 ? schemaLessViews[0] : null;
  }
  const matchingViews = views.filter(view => namesEqual(view.pureName, pureName));
  return matchingViews.length == 1 ? matchingViews[0] : null;
}

function extractSelectFromCreateView(createSql) {
  if (!createSql) return null;
  const match = createSql.match(/\bas\s+(select\b[\s\S]*)/i);
  return match ? match[1] : createSql;
}

function unquoteIdentifier(identifier) {
  const trimmed = identifier?.trim();
  if (!trimmed) return null;
  if (
    (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
    (trimmed.startsWith('`') && trimmed.endsWith('`')) ||
    (trimmed.startsWith('[') && trimmed.endsWith(']'))
  ) {
    return trimmed.slice(1, -1).replace(/""/g, '"').replace(/``/g, '`').replace(/]]/g, ']');
  }
  return trimmed;
}

function extractCreateViewColumnNames(createSql) {
  if (!createSql) return null;
  const asMatch = createSql.match(/\bas\b/i);
  if (!asMatch) return null;
  const prefix = createSql.substring(0, asMatch.index);
  const match = prefix.match(/\(([^()]*)\)\s*$/);
  if (!match) return null;
  const columns = match[1]
    .split(',')
    .map(column => unquoteIdentifier(column))
    .filter(Boolean);
  return columns.length > 0 ? columns : null;
}

function getViewColumnNames(view) {
  const analysedColumns = view?.columns?.map(column => column.columnName).filter(Boolean);
  if (analysedColumns?.length) return analysedColumns;
  return extractCreateViewColumnNames(view?.createSql);
}

function isSelectStarFromSingleTable(selectSql) {
  return /^\s*select\s+\*\s+from\b/i.test(selectSql || '');
}

function getSelectListItemCount(selectSql) {
  const selectMatch = selectSql?.match(/^\s*select\s+([\s\S]+?)\s+from\s/i);
  return selectMatch ? splitTopLevelCommaList(selectMatch[1]).length : null;
}

const identifierPattern = '`(?:``|[^`])+`|"(?:""|[^"])+"|\\[[^\\]]+\\]|[A-Za-z_@$#][A-Za-z0-9_@$#]*';
const qualifiedIdentifierPattern = `(?:${identifierPattern})(?:\\s*\\.\\s*(?:${identifierPattern}))*`;
const qualifiedIdentifierOnlyRegex = new RegExp(`^\\s*${qualifiedIdentifierPattern}\\s*$`, 'i');
const aliasStopWordPattern =
  'on|where|join|inner|left|right|full|outer|cross|straight_join|group|order|having|limit|union';

function splitTopLevelCommaList(text) {
  const result = [];
  let current = '';
  let quote = null;
  let depth = 0;

  for (let index = 0; index < text.length; index++) {
    const ch = text[index];
    const next = text[index + 1];

    if (quote) {
      current += ch;
      if (ch == quote) {
        if ((quote == '"' || quote == '`') && next == quote) {
          current += next;
          index++;
        } else {
          quote = null;
        }
      }
      continue;
    }

    if (ch == '"' || ch == '`' || ch == '[') {
      quote = ch == '[' ? ']' : ch;
      current += ch;
      continue;
    }
    if (ch == '(') depth++;
    if (ch == ')' && depth > 0) depth--;
    if (ch == ',' && depth == 0) {
      result.push(current.trim());
      current = '';
      continue;
    }
    current += ch;
  }

  if (current.trim()) result.push(current.trim());
  return result;
}

function extractIdentifierParts(text) {
  const identifierRegex = new RegExp(identifierPattern, 'g');
  return (text.match(identifierRegex) || []).map(identifier => unquoteIdentifier(identifier));
}

function extractMySqlStyleViewColumnMetadata(selectSql, dbinfo) {
  if (!selectSql) return null;
  const selectMatch = selectSql.match(/^\s*select\s+([\s\S]+?)\s+from\s/i);
  if (!selectMatch) return null;

  const tableByAlias = {};
  const tableRegex = new RegExp(
    `\\b(?:from|join)\\s+\\(*\\s*(${qualifiedIdentifierPattern})(?:\\s+(?:as\\s+)?(?!\\b(?:${aliasStopWordPattern})\\b)(${identifierPattern}))?`,
    'gi'
  );
  let tableMatch;
  while ((tableMatch = tableRegex.exec(selectSql))) {
    const tableParts = extractIdentifierParts(tableMatch[1]);
    const alias = unquoteIdentifier(tableMatch[2]);
    if (!tableParts.length) continue;
    const metadata = {
      schemaName: tableParts.length >= 2 ? tableParts[tableParts.length - 2] : undefined,
      tableName: tableParts[tableParts.length - 1],
    };
    if (alias) tableByAlias[alias.toLowerCase()] = metadata;
    tableByAlias[metadata.tableName.toLowerCase()] = metadata;
  }
  if (Object.keys(tableByAlias).length == 0) return null;

  const result = {};
  for (const item of splitTopLevelCommaList(selectMatch[1])) {
    const [sourceText, aliasText] = item.split(/\s+\bas\b\s+/i);
    if (!qualifiedIdentifierOnlyRegex.test(sourceText)) continue;
    const sourceParts = extractIdentifierParts(sourceText);
    if (sourceParts.length < 2) continue;
    const sourceColumnName = sourceParts[sourceParts.length - 1];
    const qualifier = sourceParts[sourceParts.length - 2];
    const table = tableByAlias[qualifier.toLowerCase()];
    if (!table) continue;
    const aliasParts = aliasText ? extractIdentifierParts(aliasText) : [];
    const resultColumnName = aliasParts[0] || sourceColumnName;
    result[resultColumnName] = resolveMetadataTable(
      {
        ...table,
        sourceColumnName,
      },
      dbinfo
    );
  }

  return Object.keys(result).length == 0 ? null : result;
}

function resolveMetadataTable(metadata, dbinfo) {
  if (!metadata?.tableName) return metadata;
  const table = findTable(dbinfo, metadata.schemaName, metadata.tableName);
  if (!table) return metadata;
  return {
    ...metadata,
    tableName: table.pureName,
    schemaName: table.schemaName,
  };
}

function createViewColumnMetadata(view, dbinfo) {
  const selectSql = extractSelectFromCreateView(view?.createSql);
  if (!selectSql) return null;
  const viewColumnNames = getViewColumnNames(view);
  const columnMetadata = extractColumnMetadataFromSql(selectSql) || extractMySqlStyleViewColumnMetadata(selectSql, dbinfo);

  if (columnMetadata && Object.keys(columnMetadata).length > 0) {
    if (!viewColumnNames?.length) {
      return Object.fromEntries(
        Object.entries(columnMetadata).map(([columnName, metadata]) => [
          columnName,
          resolveMetadataTable(metadata, dbinfo),
        ])
      );
    }

    const metadataValues = Object.values(columnMetadata).map(metadata => resolveMetadataTable(metadata, dbinfo));
    const allowPositionalFallback =
      metadataValues.length == viewColumnNames.length && metadataValues.length == getSelectListItemCount(selectSql);
    const result = {};
    for (let index = 0; index < viewColumnNames.length; index++) {
      const columnName = viewColumnNames[index];
      const metadata = getColumnMetadata(columnMetadata, columnName);
      const resolvedMetadata = metadata
        ? resolveMetadataTable(metadata, dbinfo)
        : allowPositionalFallback
          ? metadataValues[index]
          : null;
      if (resolvedMetadata) result[columnName] = resolvedMetadata;
    }
    return result;
  }

  if (!viewColumnNames?.length || !isSelectStarFromSingleTable(selectSql)) return columnMetadata;
  const sourceTable = extractSingleTableFromSql(selectSql);
  const table = findTable(dbinfo, sourceTable?.schemaName, sourceTable?.tableName);
  if (!table?.columns?.length) return columnMetadata;

  const result = {};
  for (let index = 0; index < viewColumnNames.length; index++) {
    const sourceColumn = table.columns[index];
    if (!sourceColumn?.columnName) continue;
    result[viewColumnNames[index]] = {
      tableName: table.pureName,
      schemaName: table.schemaName,
      sourceColumnName: sourceColumn.columnName,
    };
  }
  return result;
}

function resolveViewResultColumns(columns, dbinfo) {
  if (!columns?.length) return columns;
  if (!dbinfo?.views?.length && !dbinfo?.matviews?.length) return columns;

  return columns.map(column => {
    const view = findView(dbinfo, column.tableSchema, column.tableName);
    if (!view?.createSql) return column;

    const columnMetadata = createViewColumnMetadata(view, dbinfo);
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
  resolveViewResultColumns,
};
