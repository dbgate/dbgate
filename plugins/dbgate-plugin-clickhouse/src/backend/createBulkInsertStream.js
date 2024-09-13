const { createBulkInsertStreamBase } = global.DBGATE_PACKAGES['dbgate-tools'];
const _ = require('lodash');

/**
 *
 * @param {import('dbgate-types').EngineDriver} driver
 */
function createOracleBulkInsertStream(driver, stream, pool, name, options) {
  const writable = createBulkInsertStreamBase(driver, stream, pool, name, options);

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
