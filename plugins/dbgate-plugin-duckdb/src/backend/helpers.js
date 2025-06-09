const {
  DuckDBTimestampValue,
  DuckDBDecimalValue,
  DuckDBDateValue,
  DuckDBTimeValue,
  DuckDBIntervalValue,
  DuckDBBlobValue,
  DuckDBBitValue,
  DuckDBUUIDValue,
} = require('@duckdb/node-api');
/**
 * @param {string[]} columnNames
 * @param {import('@duckdb/node-api').DuckDBType[]} columnTypes
 */
function getColumnsInfo(columnNames, columnTypes) {
  const columns = [];

  for (let i = columnNames.length - 1; i >= 0; i--) {
    columns.push({
      columnName: columnNames[i],
      dataType: columnTypes[i].toString(),
    });
  }

  return columns;
}

function _normalizeValue(value) {
  if (value === null) {
    return null;
  }

  if (typeof value === 'bigint') {
    const parsed = parseInt(value);
    if (Number.isSafeInteger(parsed)) {
      return parsed;
    } else {
      return {
        $bigint: value.toString(),
      };
    }
  }

  if (value instanceof DuckDBTimestampValue) {
    const date = new Date(Number(value.micros / 1000n));
    return date.toISOString();
  }

  if (value instanceof DuckDBDecimalValue) {
    return value.toDouble();
  }

  if (value instanceof DuckDBDateValue) {
    return value.toString();
  }

  if (value instanceof DuckDBTimeValue) {
    const parts = value.toParts();
    const hour = String(parts.hour).padStart(2, '0');
    const minute = String(parts.min).padStart(2, '0');
    const second = String(parts.sec).padStart(2, '0');
    const micros = String(parts.micros).padStart(6, '0').substring(0, 3);
    return `${hour}:${minute}:${second}.${micros}`;
  }

  if (value instanceof DuckDBBlobValue) {
    return value.toString();
  }

  if (value instanceof DuckDBBitValue) {
    return value.toString();
  }

  if (value instanceof DuckDBUUIDValue) {
    return value.toString();
  }

  if (value instanceof DuckDBIntervalValue) {
    let result = '';
    if (value.months !== 0) {
      const years = Math.floor(value.months / 12);
      const remainingMonths = value.months % 12;
      if (years !== 0) result += `${years}y `;
      if (remainingMonths !== 0) result += `${remainingMonths}m `;
    }
    if (value.days !== 0) {
      result += `${value.days}d `;
    }
    if (value.micros !== 0n) {
      const microseconds = Number(value.micros);
      const seconds = Math.floor(microseconds / 1000000);
      const remainingMicros = microseconds % 1000000;
      if (seconds !== 0) result += `${seconds}s `;
      if (remainingMicros !== 0) result += `${remainingMicros}μs `;
    }
    return result.trim() || '0';
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
