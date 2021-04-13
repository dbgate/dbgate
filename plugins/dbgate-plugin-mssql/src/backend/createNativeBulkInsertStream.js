const { createBulkInsertStreamBase } = require('dbgate-tools');

function runBulkInsertBatch(pool, tableName, writable, rows) {
  return new Promise((resolve, reject) => {
    const tableMgr = pool.tableMgr();
    tableMgr.bind(tableName, bulkMgr => {
      bulkMgr.insertRows(rows, err => {
        if (err) reject(err);
        resolve();
      });
    });
  });
}

/**
 *
 * @param {import('dbgate-types').EngineDriver} driver
 */
function createNativeBulkInsertStream(driver, stream, pool, name, options) {
  const writable = createBulkInsertStreamBase(driver, stream, pool, name, options);

  const fullName = name.schemaName ? `[${name.schemaName}].[${name.pureName}]` : name.pureName;

  writable.send = async () => {
    const rows = writable.buffer;
    writable.buffer = [];

    await runBulkInsertBatch(pool, fullName, writable, rows);
  };

  return writable;
}

module.exports = createNativeBulkInsertStream;
