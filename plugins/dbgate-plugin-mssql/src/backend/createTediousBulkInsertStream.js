const { createBulkInsertStreamBase, getLogger, extractErrorLogData } = global.DBGATE_PACKAGES['dbgate-tools'];
const tedious = require('tedious');
const getConcreteType = require('./getConcreteType');
const _ = require('lodash');
const logger = getLogger('tediousBulkInsertStream');

function runBulkInsertBatch(dbhan, tableName, writable, rows) {
  return new Promise((resolve, reject) => {
    const options = { keepNulls: true };

    // instantiate - provide the table where you'll be inserting to, options and a callback
    const bulkLoad = dbhan.client.newBulkLoad(tableName, options, (error, rowCount) => {
      if (error) reject(error);
      else resolve();
    });

    const stringColumns = new Set();

    for (const column of writable.columnNames) {
      const tcol = writable.templateColumns.find(x => x.columnName == column);

      const type = tcol
        ? getConcreteType(tcol.driverNativeColumn.type, tcol.driverNativeColumn.dataLength)
        : tedious.TYPES.NVarChar;

      if (type.type.toLowerCase().includes('char')) stringColumns.add(column);

      bulkLoad.addColumn(column, type, {
        nullable: tcol ? !tcol.notNull : true,
        length: tcol ? tcol.driverNativeColumn.dataLength : undefined,
        precision: tcol ? tcol.driverNativeColumn.precision : undefined,
        scale: tcol ? tcol.driverNativeColumn.scale : undefined,
      });
    }

    const rowsMapped = rows.map(row =>
      _.mapValues(row, (v, k) => {
        if (stringColumns.has(k)) return v ? v.toString() : null;
        return v;
      })
    );
    // console.log('IMPORT ROWS', rowsMapped);

    dbhan.client.execBulkLoad(bulkLoad, rowsMapped);
  });
}

/**
 *
 * @param {import('dbgate-types').EngineDriver} driver
 */
function createTediousBulkInsertStream(driver, stream, dbhan, name, options) {
  const writable = createBulkInsertStreamBase(driver, stream, dbhan, name, options);

  const fullName = name.schemaName ? `[${name.schemaName}].[${name.pureName}]` : `[${name.pureName}]`;

  writable.send = async () => {
    if (!writable.templateColumns) {
      const fullNameQuoted = name.schemaName
        ? `${driver.dialect.quoteIdentifier(name.schemaName)}.${driver.dialect.quoteIdentifier(name.pureName)}`
        : driver.dialect.quoteIdentifier(name.pureName);

      const respTemplate = await driver.query(dbhan, `SELECT * FROM ${fullNameQuoted} WHERE 1=0`, {
        addDriverNativeColumn: true,
      });
      writable.templateColumns = respTemplate.columns;
    }

    const rows = writable.buffer;
    writable.buffer = [];

    try {
      await runBulkInsertBatch(dbhan, fullName, writable, rows);
    } catch (err) {
      logger.error(extractErrorLogData(err), 'Error during bulk insert, insert stopped');
      // writable.emit('error', err);
      writable.destroy(err);
    }
  };

  return writable;
}

module.exports = createTediousBulkInsertStream;
