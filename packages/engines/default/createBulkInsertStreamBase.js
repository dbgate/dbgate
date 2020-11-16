const { prepareTableForImport } = require('dbgate-tools');
const _ = require('lodash');

/**
 *
 * @param {import('dbgate-types').EngineDriver} driver
 */
function createBulkInsertStreamBase(driver, stream, pool, name, options) {
  const fullNameQuoted = name.schemaName
    ? `${driver.dialect.quoteIdentifier(name.schemaName)}.${driver.dialect.quoteIdentifier(name.pureName)}`
    : driver.dialect.quoteIdentifier(name.pureName);

  const writable = new stream.Writable({
    objectMode: true,
  });

  writable.buffer = [];
  writable.structure = null;
  writable.columnNames = null;

  writable.addRow = async (row) => {
    if (writable.structure) {
      writable.buffer.push(row);
    } else {
      writable.structure = row;
      await writable.checkStructure();
    }
  };

  writable.checkStructure = async () => {
    let structure = await driver.analyseSingleTable(pool, name);
    // console.log('ANALYSING', name, structure);
    if (structure && options.dropIfExists) {
      console.log(`Dropping table ${fullNameQuoted}`);
      await driver.query(pool, `DROP TABLE ${fullNameQuoted}`);
    }
    if (options.createIfNotExists && (!structure || options.dropIfExists)) {
      console.log(`Creating table ${fullNameQuoted}`);
      const dmp = driver.createDumper();
      dmp.createTable(prepareTableForImport({ ...writable.structure, ...name }));
      console.log(dmp.s);
      await driver.query(pool, dmp.s);
      structure = await driver.analyseSingleTable(pool, name);
    }
    if (options.truncate) {
      await driver.query(pool, `TRUNCATE TABLE ${fullNameQuoted}`);
    }

    this.columnNames = _.intersection(
      structure.columns.map((x) => x.columnName),
      writable.structure.columns.map((x) => x.columnName)
    );
  };

  writable.send = async () => {
    const rows = writable.buffer;
    writable.buffer = [];

    const dmp = driver.createDumper();

    dmp.putRaw(`INSERT INTO ${fullNameQuoted} (`);
    dmp.putCollection(',', this.columnNames, (col) => dmp.putRaw(driver.dialect.quoteIdentifier(col)));
    dmp.putRaw(')\n VALUES\n');

    let wasRow = false;
    for (const row of rows) {
      if (wasRow) dmp.putRaw(',\n');
      dmp.putRaw('(');
      dmp.putCollection(',', this.columnNames, (col) => dmp.putValue(row[col]));
      dmp.putRaw(')');
      wasRow = true;
    }
    dmp.putRaw(';');
    // require('fs').writeFileSync('/home/jena/test.sql', dmp.s);
    await driver.query(pool, dmp.s);
  };

  writable.sendIfFull = async () => {
    if (writable.buffer.length > 100) {
      await writable.send();
    }
  };

  writable._write = async (chunk, encoding, callback) => {
    await writable.addRow(chunk);
    await writable.sendIfFull();
    callback();
  };

  writable._final = async (callback) => {
    await writable.send();
    callback();
  };

  return writable;
}

module.exports = createBulkInsertStreamBase;
