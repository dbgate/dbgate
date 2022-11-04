import _ from 'lodash';
import type { DatabaseInfo, EngineDriver } from 'dbgate-types';

export async function enrichWithPreloadedRows(
  dbModel: DatabaseInfo,
  dbTarget: DatabaseInfo,
  conn,
  driver: EngineDriver
): Promise<DatabaseInfo> {
  // const res = { ...dbTarget, tables: [...(dbTarget.tables || [])] };
  const repl = {};
  for (const tableTarget of dbTarget.tables) {
    const tableModel = dbModel.tables.find(x => x.pairingId == tableTarget.pairingId);
    if ((tableModel?.preloadedRows?.length || 0) == 0) continue;
    const keyColumns = tableModel.preloadedRowsKey || tableModel.primaryKey?.columns?.map(x => x.columnName);
    if ((keyColumns?.length || 0) == 0) continue;
    const dmp = driver.createDumper();
    if (keyColumns.length == 1) {
      dmp.putCmd(
        '^select * ^from %f ^where %i ^in (%,v)',
        tableTarget,
        keyColumns[0],
        tableModel.preloadedRows.map(x => x[keyColumns[0]])
      );
    } else {
      dmp.put('^select * ^from %f ^where', tableTarget);
      dmp.putCollection(' ^or ', tableModel.preloadedRows, row => {
        dmp.put('(');
        dmp.putCollection(' ^and ', keyColumns, col => dmp.put('%i=%v', col, row[col]));
        dmp.put(')');
      });
      dmp.endCommand();
    }
    const resp = await driver.query(conn, dmp.s);
    repl[tableTarget.pairingId] = {
      ...tableTarget,
      preloadedRows: resp.rows,
      preloadedRowsKey: keyColumns,
    };
  }

  if (_.isEmpty(repl)) return dbTarget;
  return {
    ...dbTarget,
    tables: dbTarget.tables.map(x => repl[x.pairingId] || x),
  };
}
