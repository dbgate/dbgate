import { EngineDriver, WriteTableOptions } from 'dbgate-types';
import _intersection from 'lodash/intersection';
import { getLogger } from './getLogger';
import { prepareTableForImport } from './tableTransforms';

const logger = getLogger('bulkStreamBase');

export function createBulkInsertStreamBase(driver: EngineDriver, stream, pool, name, options: WriteTableOptions): any {
  const fullNameQuoted = name.schemaName
    ? `${driver.dialect.quoteIdentifier(name.schemaName)}.${driver.dialect.quoteIdentifier(name.pureName)}`
    : driver.dialect.quoteIdentifier(name.pureName);

  const writable = new stream.Writable({
    objectMode: true,
  });

  writable.buffer = [];
  writable.structure = null;
  writable.columnNames = null;
  writable.requireFixedStructure = driver.databaseEngineTypes.includes('sql');

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
      logger.info(`Dropping table ${fullNameQuoted}`);
      await driver.script(pool, `DROP TABLE ${fullNameQuoted}`);
    }
    if (options.createIfNotExists && (!structure || options.dropIfExists)) {
      const dmp = driver.createDumper();
      dmp.createTable(prepareTableForImport({ ...writable.structure, ...name }));
      logger.info({ sql: dmp.s }, `Creating table ${fullNameQuoted}`);
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

    if (driver.dialect.allowMultipleValuesInsert) {
      const dmp = driver.createDumper();
      dmp.putRaw(`INSERT INTO ${fullNameQuoted} (`);
      dmp.putCollection(',', writable.columnNames, col => dmp.putRaw(driver.dialect.quoteIdentifier(col as string)));
      dmp.putRaw(')\n VALUES\n');

      let wasRow = false;
      for (const row of rows) {
        if (wasRow) dmp.putRaw(',\n');
        dmp.putRaw('(');
        dmp.putCollection(',', writable.columnNames, col => dmp.putValue(row[col as string]));
        dmp.putRaw(')');
        wasRow = true;
      }
      dmp.putRaw(';');
      // require('fs').writeFileSync('/home/jena/test.sql', dmp.s);
      // console.log(dmp.s);
      await driver.query(pool, dmp.s, { discardResult: true });
    } else {
      for (const row of rows) {
        const dmp = driver.createDumper();
        dmp.putRaw(`INSERT INTO ${fullNameQuoted} (`);
        dmp.putCollection(',', writable.columnNames, col => dmp.putRaw(driver.dialect.quoteIdentifier(col as string)));
        dmp.putRaw(')\n VALUES\n');

        dmp.putRaw('(');
        dmp.putCollection(',', writable.columnNames, col => dmp.putValue(row[col as string]));
        dmp.putRaw(')');
        await driver.query(pool, dmp.s, { discardResult: true });
      }
    }
    if (options.commitAfterInsert) {
      const dmp = driver.createDumper();
      dmp.commitTransaction();
      await driver.query(pool, dmp.s, { discardResult: true });
    }
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
