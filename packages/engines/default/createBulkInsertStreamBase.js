const { prepareTableForImport } = require('@dbgate/tools');
const _ = require('lodash');

/**
 *
 * @param {import('@dbgate/types').EngineDriver} driver
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

    const respTemplate = await pool.request().query(`SELECT * FROM ${fullNameQuoted} WHERE 1=0`);
    writable.templateColumns = respTemplate.recordset.toTable().columns;
    // console.log('writable.templateColumns', writable.templateColumns);

    this.columnNames = _.intersection(
      structure.columns.map((x) => x.columnName),
      writable.structure.columns.map((x) => x.columnName)
    );
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
