const { createBulkInsertStreamBase } = require('dbgate-tools');
const tedious = require('tedious');
const getConcreteType = require('./getConcreteType');

function runBulkInsertBatch(pool, tableName, writable, rows) {
  return new Promise((resolve, reject) => {
    var options = { keepNulls: true };

    // instantiate - provide the table where you'll be inserting to, options and a callback
    var bulkLoad = pool.newBulkLoad(tableName, options, (error, rowCount) => {
      if (error) reject(error);
      else resolve();
    });

    for (const column of writable.columnNames) {
      const tcol = writable.templateColumns.find((x) => x.columnName == column);

      bulkLoad.addColumn(
        column,
        tcol
          ? getConcreteType(tcol.driverNativeColumn.type, tcol.driverNativeColumn.dataLength)
          : tedious.TYPES.NVarChar,
        {
          nullable: tcol ? !tcol.notNull : true,
          length: tcol ? tcol.driverNativeColumn.dataLength : undefined,
          precision: tcol ? tcol.driverNativeColumn.precision : undefined,
          scale: tcol ? tcol.driverNativeColumn.scale : undefined,
        }
      );
    }

    for (const row of rows) {
      bulkLoad.addRow(row);
    }

    pool.execBulkLoad(bulkLoad);
  });
}

/**
 *
 * @param {import('dbgate-types').EngineDriver} driver
 */
function createTediousBulkInsertStream(driver, stream, pool, name, options) {
  const writable = createBulkInsertStreamBase(driver, stream, pool, name, options);

  const fullName = name.schemaName ? `[${name.schemaName}].[${name.pureName}]` : name.pureName;

  writable.send = async () => {
    if (!writable.templateColumns) {
      const fullNameQuoted = name.schemaName
        ? `${driver.dialect.quoteIdentifier(name.schemaName)}.${driver.dialect.quoteIdentifier(name.pureName)}`
        : driver.dialect.quoteIdentifier(name.pureName);

      const respTemplate = await driver.query(pool, `SELECT * FROM ${fullNameQuoted} WHERE 1=0`, {
        addDriverNativeColumn: true,
      });
      writable.templateColumns = respTemplate.columns;
    }

    const rows = writable.buffer;
    writable.buffer = [];

    await runBulkInsertBatch(pool, fullName, writable, rows);
  };

  return writable;
}

module.exports = createTediousBulkInsertStream;
