const { createBulkInsertStreamBase } = global.DBGATE_PACKAGES['dbgate-tools'];

/**
 *
 * @param {import('dbgate-types').TableInfo} tableInfo
 * @param {string} columnName
 * @returns {{columnName: string, dataType: string} | null}
 */
function getColumnInfo(tableInfo, columnName) {
  const column = tableInfo.columns.find((x) => x.columnName == columnName);
  if (!column) return null;

  return {
    columnName,
    dataType: column.dataType,
  };
}

/**
 *
 * @param {string} tableName
 * @returns {import('dbgate-types').TableInfo | null}
 */

/**
 * @param {string} tableName
 * @returns {{ shouldAddUuidPk: true, pkColumnName: string } | { shouldAddUuidPk: false }}
 */
function getShouldAddUuidPkInfo(tableInfo) {
  const hasIdColumn = tableInfo.columns.some((x) => x.columnName == 'id');
  if (hasIdColumn && !tableInfo.primaryKey) return { shouldAddUuidPk: false };
  const pkColumnName = tableInfo.primaryKey?.columns[0]?.columnName;
  if (!pkColumnName) return { shouldAddUuidPk: true, pkColumnName: 'id' };

  const columnInfo = getColumnInfo(tableInfo, pkColumnName);
  if (!columnInfo) return { shouldAddUuidPk: false };

  const shouldAddUuidPk = tableInfo.columns.every((i) => i.columnName !== columnInfo.columnName);
  if (!shouldAddUuidPk) return { shouldAddUuidPk };

  return { shouldAddUuidPk, pkColumnName };
}

/**
 *
 * @param {import('dbgate-types').EngineDriver<import('cassandra-driver').Client>} driver
 * @param {import('stream')} stream
 * @param {import('dbgate-types').DatabaseHandle<import('cassandra-driver').Client>} dbhan
 * @param {import('dbgate-types').NamedObjectInfo} name
 * @param {import('dbgate-types').WriteTableOptions} option
 */
function createCassandraBulkInsertStream(driver, stream, dbhan, name, options) {
  const writable = createBulkInsertStreamBase(driver, stream, dbhan, name, options);

  writable.send = async () => {
    const { shouldAddUuidPk, pkColumnName } = getShouldAddUuidPkInfo(writable.structure);

    const rows = writable.buffer;
    const fullNameQuoted = writable.fullNameQuoted;
    writable.buffer = [];

    for (const row of rows) {
      const dmp = driver.createDumper();
      dmp.putRaw(`INSERT INTO ${fullNameQuoted} (`);
      if (shouldAddUuidPk) {
        dmp.putRaw(driver.dialect.quoteIdentifier(pkColumnName));
        dmp.putRaw(', ');
      }
      dmp.putCollection(',', writable.columnNames, (col) => dmp.putRaw(driver.dialect.quoteIdentifier(col)));
      dmp.putRaw(')\n VALUES\n');

      dmp.putRaw('(');
      if (shouldAddUuidPk) {
        dmp.putRaw('uuid()');
        dmp.putRaw(', ');
      }
      dmp.putCollection(',', writable.columnNames, (col) => {
        const existingColumn = getColumnInfo(writable.structure, col);
        const dataType = existingColumn?.dataType;

        if (dataType) {
          dmp.putValue(row[col], dataType);
        } else {
          dmp.putValue(row[col]?.toString());
        }
      });
      dmp.putRaw(')');
      await driver.query(dbhan, dmp.s, { discardResult: true });
    }
  };

  return writable;
}

module.exports = createCassandraBulkInsertStream;
