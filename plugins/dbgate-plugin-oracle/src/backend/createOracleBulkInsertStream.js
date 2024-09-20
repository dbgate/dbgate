const { createBulkInsertStreamBase } = global.DBGATE_PACKAGES['dbgate-tools'];
const _ = require('lodash');

/**
 *
 * @param {import('dbgate-types').EngineDriver} driver
 */
function createOracleBulkInsertStream(driver, stream, dbhan, name, options) {
  const fullNameQuoted = name.schemaName
    ? `${driver.dialect.quoteIdentifier(name.schemaName)}.${driver.dialect.quoteIdentifier(name.pureName)}`
    : driver.dialect.quoteIdentifier(name.pureName);

  const writable = createBulkInsertStreamBase(driver, stream, dbhan, name, {
    ...options,
    // this is really not used, send method below is used instead
    commitAfterInsert: true,
  });

  writable.send = async () => {
    const dmp = driver.createDumper();
    dmp.putRaw(`INSERT INTO ${fullNameQuoted} (`);
    dmp.putCollection(',', writable.columnNames, col => dmp.putRaw(driver.dialect.quoteIdentifier(col)));
    dmp.putRaw(')\n VALUES (\n');
    dmp.put(
      '%,s',
      writable.columnNames.map((c, i) => `:C${i}`)
    );
    dmp.putRaw(')');

    const rows = writable.buffer.map(row => _.mapKeys(row, (v, k) => `c${writable.columnNames.indexOf(k)}`));
    await dbhan.client.executeMany(dmp.s, rows, { autoCommit: true });
    writable.buffer = [];
  };

  return writable;
}

module.exports = createOracleBulkInsertStream;
