import { EngineDriver, WriteTableOptions } from 'dbgate-types';
import _intersection from 'lodash/intersection';
import _fromPairs from 'lodash/fromPairs';
import { getLogger } from './getLogger';
import { prepareTableForImport } from './tableTransforms';
import { RowProgressReporter } from './rowProgressReporter';
import { extractErrorLogData } from './stringTools';

const logger = getLogger('bulkStreamBase');

export function createBulkInsertStreamBase(driver: EngineDriver, stream, dbhan, name, options: WriteTableOptions): any {
  const fullNameQuoted = name.schemaName
    ? `${driver.dialect.quoteIdentifier(name.schemaName)}.${driver.dialect.quoteIdentifier(name.pureName)}`
    : driver.dialect.quoteIdentifier(name.pureName);

  const writable = new stream.Writable({
    objectMode: true,
  });

  writable.fullNameQuoted = fullNameQuoted;
  writable.buffer = [];
  writable.structure = null;
  writable.columnNames = null;
  writable.columnDataTypes = null;
  writable.requireFixedStructure = driver.databaseEngineTypes.includes('sql');
  writable.rowsReporter = new RowProgressReporter(options.progressName);

  writable.addRow = async row => {
    if (writable.structure) {
      writable.buffer.push(row);
    } else {
      writable.structure = row;
      await writable.checkStructure();
    }
  };

  writable.checkStructure = async () => {
    try {
      let structure = options.targetTableStructure ?? (await driver.analyseSingleTable(dbhan, name));
      if (structure) {
        writable.structure = structure;
      }
      if (structure && options.dropIfExists) {
        logger.info(`DBGM-00123 Dropping table ${fullNameQuoted}`);
        await driver.script(dbhan, `DROP TABLE ${fullNameQuoted}`);
      }
      if (options.createIfNotExists && (!structure || options.dropIfExists)) {
        const dmp = driver.createDumper();
        const createdTableInfo = driver.adaptTableInfo(prepareTableForImport({ ...writable.structure, ...name }));
        dmp.createTable(createdTableInfo);
        logger.info({ sql: dmp.s }, `DBGM-00124 Creating table ${fullNameQuoted}`);
        await driver.script(dbhan, dmp.s);
        structure = await driver.analyseSingleTable(dbhan, name);
        writable.structure = structure;
      }
      if (!writable.structure) {
        throw new Error(`DBGM-00125 Error importing table - ${fullNameQuoted} not found`);
      }
      if (options.truncate) {
        await driver.script(dbhan, `TRUNCATE TABLE ${fullNameQuoted}`);
      }

      writable.columnNames = _intersection(
        structure.columns.map(x => x.columnName),
        writable.structure.columns.map(x => x.columnName)
      );
      writable.columnDataTypes = _fromPairs(
        writable.columnNames.map(colName => [
          colName,
          writable.structure.columns.find(x => x.columnName == colName)?.dataType,
        ])
      );
    } catch (err) {
      logger.error(extractErrorLogData(err), 'DBGM-00184 Error during preparing bulk insert table, stopped');
      writable.destroy(err);
    }
  };

  writable.send = async () => {
    const rows = writable.buffer;
    writable.buffer = [];

    try {
      if (driver.dialect.allowMultipleValuesInsert) {
        const dmp = driver.createDumper();
        dmp.putRaw(`INSERT INTO ${fullNameQuoted} (`);
        dmp.putCollection(',', writable.columnNames, col => dmp.putRaw(driver.dialect.quoteIdentifier(col as string)));
        dmp.putRaw(')\n VALUES\n');

        let wasRow = false;
        for (const row of rows) {
          if (wasRow) dmp.putRaw(',\n');
          dmp.putRaw('(');
          dmp.putCollection(',', writable.columnNames, col =>
            dmp.putValue(row[col as string], writable.columnDataTypes?.[col as string])
          );
          dmp.putRaw(')');
          wasRow = true;
        }
        dmp.putRaw(';');
        // require('fs').writeFileSync('/home/jena/test.sql', dmp.s);
        // console.log(dmp.s);
        if (rows.length > 0) {
          try {
            await driver.query(dbhan, dmp.s, { discardResult: true });
          } catch (batchErr) {
            // Batch failed - retry row by row to identify the exact problematic row
            logger.warn(
              extractErrorLogData(batchErr),
              `DBGM-00000 Batch insert of ${rows.length} rows failed, retrying row by row to find the cause`
            );
            for (let rowIndex = 0; rowIndex < rows.length; rowIndex++) {
              const row = rows[rowIndex];
              const rowDmp = driver.createDumper();
              rowDmp.putRaw(`INSERT INTO ${fullNameQuoted} (`);
              rowDmp.putCollection(',', writable.columnNames, col =>
                rowDmp.putRaw(driver.dialect.quoteIdentifier(col as string))
              );
              rowDmp.putRaw(')\n VALUES\n(');
              rowDmp.putCollection(',', writable.columnNames, col =>
                rowDmp.putValue(row[col as string], writable.columnDataTypes?.[col as string])
              );
              rowDmp.putRaw(');');
              try {
                await driver.query(dbhan, rowDmp.s, { discardResult: true });
                writable.rowsReporter.add(1);
              } catch (rowErr) {
                const safeRow = JSON.stringify(row, (_k, v) => {
                  if (typeof v === 'string' && v.length > 200) return v.slice(0, 200) + '...(truncated)';
                  return v;
                });
                logger.error(
                  extractErrorLogData(rowErr, { rowIndex, row: safeRow }),
                  `DBGM-00000 Insert failed on row ${rowIndex + 1}: ${rowErr.message}`
                );
                throw rowErr;
              }
            }
          }
        }
        writable.rowsReporter.add(rows.length);
      } else {
        for (const row of rows) {
          const dmp = driver.createDumper();
          dmp.putRaw(`INSERT INTO ${fullNameQuoted} (`);
          dmp.putCollection(',', writable.columnNames, col =>
            dmp.putRaw(driver.dialect.quoteIdentifier(col as string))
          );
          dmp.putRaw(')\n VALUES\n');

          dmp.putRaw('(');
          dmp.putCollection(',', writable.columnNames, col =>
            dmp.putValue(row[col as string], writable.columnDataTypes?.[col as string])
          );
          dmp.putRaw(')');
          try {
            await driver.query(dbhan, dmp.s, { discardResult: true });
          } catch (rowErr) {
            const safeRow = JSON.stringify(row, (_k, v) => {
              if (typeof v === 'string' && v.length > 200) return v.slice(0, 200) + '...(truncated)';
              return v;
            });
            logger.error(
              extractErrorLogData(rowErr, { row: safeRow }),
              `DBGM-00000 Insert failed: ${rowErr.message}`
            );
            throw rowErr;
          }
          writable.rowsReporter.add(1);
        }
      }
      if (options.commitAfterInsert) {
        const dmp = driver.createDumper();
        dmp.commitTransaction();
        await driver.query(dbhan, dmp.s, { discardResult: true });
      }
    } catch (err) {
      logger.error(extractErrorLogData(err), 'DBGM-00185 Error during base bulk insert, insert stopped');
      writable.destroy(err);
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
    writable.rowsReporter.finish();
    callback();
  };

  return writable;
}
