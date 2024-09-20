const { createBulkInsertStreamBase } = global.DBGATE_PACKAGES['dbgate-tools'];

function runBulkInsertBatch(dbhan, tableName, writable, rows) {
  return new Promise((resolve, reject) => {
    const tableMgr = dbhan.client.tableMgr();
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
function createNativeBulkInsertStream(driver, stream, dbhan, name, options) {
  const writable = createBulkInsertStreamBase(driver, stream, dbhan, name, options);

  const fullName = name.schemaName ? `[${name.schemaName}].[${name.pureName}]` : name.pureName;

  writable.send = async () => {
    const rows = writable.buffer;
    writable.buffer = [];

    await runBulkInsertBatch(dbhan, fullName, writable, rows);
  };

  return writable;
}

module.exports = createNativeBulkInsertStream;
