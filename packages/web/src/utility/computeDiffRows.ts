import { DbDiffOptions, testEqualTables } from 'dbgate-tools';
import { DatabaseInfo, EngineDriver } from 'dbgate-types';

export function computeDiffRows(
  sourceDb: DatabaseInfo,
  targetDb: DatabaseInfo,
  opts: DbDiffOptions,
  driver: EngineDriver
) {
  if (!sourceDb || !targetDb || !driver) return [];
  const res = [];
  for (const obj of sourceDb.tables) {
    const paired = targetDb.tables.find(x => x.pairingId == obj.pairingId);
    if (paired) {
      res.push({
        source: obj,
        target: paired,
        state: testEqualTables(obj, paired, opts, targetDb, driver) ? 'equal' : 'changed',
      });
    } else {
      res.push({
        source: obj,
        state: 'removed',
      });
    }
  }
  for (const obj of targetDb.tables) {
    const paired = sourceDb.tables.find(x => x.pairingId == obj.pairingId);
    if (!paired) {
      res.push({
        target: obj,
        state: 'added',
      });
    }
  }

  return res.map(row => ({
    ...row,
    sourceSchemaName: row?.source?.schemaName,
    sourcePureName: row?.source?.pureName,
    targetSchemaName: row?.target?.schemaName,
    targetPureName: row?.target?.pureName,
  }));
}
