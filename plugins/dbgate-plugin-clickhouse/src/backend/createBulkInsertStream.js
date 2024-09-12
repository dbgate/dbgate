const { createBulkInsertStreamBase } = global.DBGATE_PACKAGES['dbgate-tools'];
const _ = require('lodash');

/**
 *
 * @param {import('dbgate-types').EngineDriver} driver
 */
function createOracleBulkInsertStream(driver, stream, pool, name, options) {
  const writable = createBulkInsertStreamBase(driver, stream, pool, name, {
    ...options,
    // this is really not used, send method below is used instead
    commitAfterInsert: true,
  });

  writable.send = async () => {
    await pool.insert({
      table: name.pureName,
      values: writable.buffer,
      format: 'JSONEachRow',
    });
    writable.buffer = [];
  };

  return writable;
}

module.exports = createOracleBulkInsertStream;
