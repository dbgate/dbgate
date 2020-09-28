const createBulkInsertStreamBase = require('../default/createBulkInsertStreamBase');

/**
 *
 * @param {import('@dbgate/types').EngineDriver} driver
 */
function createBulkInsertStream(driver, mssql, stream, pool, name, options) {
  const writable = createBulkInsertStreamBase(driver, stream, pool, name, options);

  const fullName = name.schemaName ? `[${name.schemaName}].[${name.pureName}]` : name.pureName;

  writable.send = async () => {
    if (!writable.templateColumns) {
      const fullNameQuoted = name.schemaName
        ? `${driver.dialect.quoteIdentifier(name.schemaName)}.${driver.dialect.quoteIdentifier(name.pureName)}`
        : driver.dialect.quoteIdentifier(name.pureName);

      const respTemplate = await pool.request().query(`SELECT * FROM ${fullNameQuoted} WHERE 1=0`);
      writable.templateColumns = respTemplate.recordset.toTable().columns;
    }

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

  return writable;
}

module.exports = createBulkInsertStream;
