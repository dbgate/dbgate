import { DbDiffOptions, testEqualColumns, testEqualTables } from 'dbgate-tools';
import { DatabaseInfo, EngineDriver, TableInfo } from 'dbgate-types';

export function computeDiffRowsCore(sourceList, targetList, testEqual) {
  const res = [];
  for (const obj of sourceList) {
    const paired = targetList.find(x => x.pairingId == obj.pairingId);
    if (paired) {
      res.push({
        source: obj,
        target: paired,
        state: testEqual(obj, paired) ? 'equal' : 'changed',
      });
    } else {
      res.push({
        source: obj,
        state: 'removed',
      });
    }
  }
  for (const obj of targetList) {
    const paired = sourceList.find(x => x.pairingId == obj.pairingId);
    if (!paired) {
      res.push({
        target: obj,
        state: 'added',
      });
    }
  }

  return res;
}

export function computeDbDiffRows(
  sourceDb: DatabaseInfo,
  targetDb: DatabaseInfo,
  opts: DbDiffOptions,
  driver: EngineDriver
) {
  if (!sourceDb || !targetDb || !driver) return [];
  return computeDiffRowsCore(sourceDb.tables, targetDb.tables, (a, b) =>
    testEqualTables(a, b, opts, targetDb, driver)
  ).map(row => ({
    ...row,
    sourceSchemaName: row?.source?.schemaName,
    sourcePureName: row?.source?.pureName,
    targetSchemaName: row?.target?.schemaName,
    targetPureName: row?.target?.pureName,
  }));
}

export function computeTableDiffColumns(
  sourceTable: TableInfo,
  targetTable: TableInfo,
  opts: DbDiffOptions,
  driver: EngineDriver
) {
  if (!sourceTable || !sourceTable || !driver) return [];
  return computeDiffRowsCore(sourceTable.columns, targetTable.columns, (a, b) =>
    testEqualColumns(a, b, true, true, opts)
  ).map(row => ({
    ...row,
    sourceColumnName: row?.source?.columnName,
    targetColumnName: row?.target?.columnName,
    sourceDataType: row?.source?.dataType,
    targetDataType: row?.target?.dataType,
    sourceNotNull: row?.source?.notNull,
    targetNotNull: row?.target?.notNull,
  }));
}
