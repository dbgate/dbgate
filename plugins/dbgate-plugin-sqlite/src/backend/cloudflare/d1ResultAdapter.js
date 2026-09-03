// @ts-check

/**
 * Converts Cloudflare D1 `/raw` responses into the result shape used by the SQLite driver.
 *
 * @typedef {{
 *   success?: boolean,
 *   results?: { columns?: string[], rows?: any[][] } | any[],
 *   meta?: {
 *     changes?: number,
 *     last_row_id?: number,
 *     rows_read?: number,
 *     rows_written?: number,
 *     duration?: number,
 *     changed_db?: boolean,
 *   },
 * }} D1RawResultItem
 */

/**
 * Reads the column names of a `/raw` result item.
 * @param {D1RawResultItem} item
 * @returns {string[]}
 */
function extractColumnNames(item) {
  const results = item?.results;
  if (results && !Array.isArray(results) && Array.isArray(results.columns)) {
    return results.columns.map((x) => String(x));
  }
  return [];
}

/**
 * Reads the raw row arrays of a `/raw` result item.
 * @param {D1RawResultItem} item
 * @returns {any[][]}
 */
function extractRowArrays(item) {
  const results = item?.results;
  if (results && !Array.isArray(results) && Array.isArray(results.rows)) {
    return results.rows;
  }
  return [];
}

/**
 * Converts a single JSON value returned by the D1 API into the value representation used by
 * DbGate. Types are preserved as they arrive - only BLOBs need translating, because the D1 API
 * encodes them as arrays of byte values, while DbGate expects the `{ $binary: { base64 } }`
 * envelope also produced by the native SQLite driver.
 *
 * @param {any} value
 */
function convertD1Value(value) {
  if (value === null || value === undefined) {
    return null;
  }
  if (Array.isArray(value)) {
    return { $binary: { base64: Buffer.from(value).toString('base64') } };
  }
  return value;
}

/**
 * Converts one `/raw` result item into a DbGate query result.
 *
 * `dataType` is intentionally left undefined: the `/raw` endpoint does not report column types,
 * and guessing a type from the returned values would produce wrong filter/editor behaviour.
 * Types of table columns are supplied by the analyser instead.
 *
 * @param {D1RawResultItem} item
 * @returns {{
 *   columns: { columnName: string }[],
 *   rows: object[],
 *   isReader: boolean,
 *   rowsAffected: number,
 *   lastInsertedId: number|undefined,
 * }}
 */
function convertD1ResultItem(item) {
  const columnNames = extractColumnNames(item);
  const rowArrays = extractRowArrays(item);

  const rows = rowArrays.map((rowArray) => {
    const row = {};
    for (let index = 0; index < columnNames.length; index++) {
      row[columnNames[index]] = convertD1Value(rowArray[index]);
    }
    return row;
  });

  const meta = item?.meta ?? {};

  return {
    columns: columnNames.map((columnName) => ({ columnName })),
    rows,
    // A statement is a "reader" when D1 reported a column list - this is how SELECT and PRAGMA
    // results are told apart from INSERT/UPDATE/DELETE/DDL, which report columns as an empty list.
    isReader: columnNames.length > 0,
    rowsAffected: typeof meta.changes == 'number' ? meta.changes : 0,
    lastInsertedId: typeof meta.last_row_id == 'number' ? meta.last_row_id : undefined,
  };
}

module.exports = {
  convertD1ResultItem,
  convertD1Value,
  extractColumnNames,
  extractRowArrays,
};
