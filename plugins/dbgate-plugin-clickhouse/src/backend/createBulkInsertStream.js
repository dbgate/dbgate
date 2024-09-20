const { createBulkInsertStreamBase } = global.DBGATE_PACKAGES['dbgate-tools'];
const _ = require('lodash');

/**
 *
 * @param {import('dbgate-types').EngineDriver} driver
 */
function createOracleBulkInsertStream(driver, stream, dbhan, name, options) {
  const writable = createBulkInsertStreamBase(driver, stream, dbhan, name, options);

  writable.send = async () => {
    await dbhan.client.insert({
      table: name.pureName,
      values: writable.buffer,
      format: 'JSONEachRow',
    });
    writable.buffer = [];
  };

  return writable;
}

module.exports = createOracleBulkInsertStream;
