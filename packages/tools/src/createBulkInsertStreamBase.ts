import { EngineDriver } from 'dbgate-types';
import _intersection from 'lodash/intersection';
import { prepareTableForImport } from './tableTransforms';

export function createBulkInsertStreamBase(driver, stream, pool, name, options): any {
  const fullNameQuoted = name.schemaName
    ? `${driver.dialect.quoteIdentifier(name.schemaName)}.${driver.dialect.quoteIdentifier(name.pureName)}`
    : driver.dialect.quoteIdentifier(name.pureName);

  const writable = new stream.Writable({
    objectMode: true,
  });

  writable.buffer = [];
  writable.structure = null;
  writable.columnNames = null;

  writable.addRow = async row => {
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
      await driver.script(pool, `DROP TABLE ${fullNameQuoted}`);
    }
    if (options.createIfNotExists && (!structure || options.dropIfExists)) {
      console.log(`Creating table ${fullNameQuoted}`);
      const dmp = driver.createDumper();
      dmp.createTable(prepareTableForImport({ ...writable.structure, ...name }));
      console.log(dmp.s);
      await driver.script(pool, dmp.s);
      structure = await driver.analyseSingleTable(pool, name);
    }
    if (options.truncate) {
      await driver.script(pool, `TRUNCATE TABLE ${fullNameQuoted}`);
    }

    writable.columnNames = _intersection(
      structure.columns.map(x => x.columnName),
      writable.structure.columns.map(x => x.columnName)
    );
  };

  writable.send = async () => {
    const rows = writable.buffer;
    writable.buffer = [];

    const dmp = driver.createDumper();

    dmp.putRaw(`INSERT INTO ${fullNameQuoted} (`);
    dmp.putCollection(',', writable.columnNames, col => dmp.putRaw(driver.dialect.quoteIdentifier(col)));
    dmp.putRaw(')\n VALUES\n');

    let wasRow = false;
    for (const row of rows) {
      if (wasRow) dmp.putRaw(',\n');
      dmp.putRaw('(');
      dmp.putCollection(',', writable.columnNames, col => dmp.putValue(row[col]));
      dmp.putRaw(')');
      wasRow = true;
    }
    dmp.putRaw(';');
    // require('fs').writeFileSync('/home/jena/test.sql', dmp.s);
    // console.log(dmp.s);
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

  writable._final = async callback => {
    await writable.send();
    callback();
  };

  return writable;
}
