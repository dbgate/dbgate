/**
 * @param {string[} columnNames
 * @param {import('@duckdb/node-api').DuckDBType[]} columnTypes
 */
function getColumnsInfo(columnNames, columnTypes) {
  const columns = [];

  for (let i = columnNames.length - 1; i >= 0; i--) {
    columns.push({
      columnName: columnNames[i],
      // dataType: columnTypes[i],
    });
  }

  return columns;
}

function _normalizeValue(value) {
  if (value === null) {
    return null;
  }

  if (typeof value === 'bigint') {
    return `${value}n`;
  }

  if (Array.isArray(value)) {
    return value.map((item) => _normalizeValue(item));
  }

  if (typeof value === 'object') {
    const normalizedObj = {};
    for (const key in value) {
      if (Object.hasOwnProperty.call(value, key)) {
        normalizedObj[key] = _normalizeValue(value[key]);
      }
    }
    return normalizedObj;
  }

  return value;
}

/**
 * @param {Record<string, import('@duckdb/node-api').DuckDBValue>} obj
 *
 */
function normalizeRow(obj) {
  if (typeof obj !== 'object' || obj === null || Array.isArray(obj)) {
    return _normalizeValue(obj);
  }

  const normalized = {};
  for (const key in obj) {
    if (Object.hasOwnProperty.call(obj, key)) {
      normalized[key] = _normalizeValue(obj[key]);
    }
  }
  return normalized;
}

module.exports = {
  normalizeRow,
  getColumnsInfo,
};
