const _ = require('lodash');

/**
 *
 * @param {import('@dbgate/types').EngineDriver} driver
 */
function createBulkInsertStream(driver, mssql, stream, pool, name, options) {
  const fullName = name.schemaName ? `[${name.schemaName}].[${name.pureName}]` : name.pureName;
  const fullNameQuoted = name.schemaName ? `[${name.schemaName}].[${name.pureName}]` : `[${name.pureName}]`;

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
      console.log(`Dropping table ${fullName}`);
      await driver.query(pool, `DROP TABLE ${fullNameQuoted}`);
    }
    if (options.createIfNotExists && (!structure || options.dropIfExists)) {
      console.log(`Creating table ${fullName}`);
      const dmp = driver.createDumper();
      dmp.createTable({ ...writable.structure, ...name });
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

  writable.send = async () => {
    const rows = writable.buffer;
    writable.buffer = [];
    const table = new mssql.Table(fullName);
    // table.create = options.createIfNotExists;
    for (const column of this.columnNames) {
      const tcol = writable.templateColumns.find((x) => x.name == column);
      // console.log('TCOL', tcol);
      // console.log('TYPE', tcol.type, mssql.Int);
      // table.columns.add(column, tcol ? tcol.type : mssql.NVarChar(mssql.MAX));
      table.columns.add(column, tcol ? tcol.type : mssql.NVarChar(mssql.MAX), {
        nullable: tcol.nullable,
        length: tcol.length,
        precision: tcol.precision,
        scale: tcol.scale,
      });
    }
    for (const row of rows) {
      table.rows.add(...this.columnNames.map((col) => row[col]));
    }
    const request = pool.request();
    await request.bulk(table);
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

module.exports = createBulkInsertStream;
