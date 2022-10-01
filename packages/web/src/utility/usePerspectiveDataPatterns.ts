import {
  analyseDataPattern,
  MultipleDatabaseInfo,
  PerspectiveCache,
  PerspectiveConfig,
  PerspectiveDatabaseConfig,
  PerspectiveDataLoadProps,
  PerspectiveDataPattern,
  PerspectiveDataPatternDict,
} from 'dbgate-datalib';
import { PerspectiveDataLoader } from 'dbgate-datalib/lib/PerspectiveDataLoader';
import { writable, Readable } from 'svelte/store';

export async function getPerspectiveDataPatterns(
  databaseConfig: PerspectiveDatabaseConfig,
  config: PerspectiveConfig,
  cache: PerspectiveCache,
  dbInfos: MultipleDatabaseInfo,
  dataLoader: PerspectiveDataLoader
): Promise<PerspectiveDataPatternDict> {
  const res = {};

  for (const node of config.nodes) {
    const conid = node.conid || databaseConfig.conid;
    const database = node.database || databaseConfig.database;
    const { schemaName, pureName } = node;

    const cached = cache.dataPatterns.find(
      x => x.conid == conid && x.database == database && x.schemaName == schemaName && x.pureName == pureName
    );
    if (cached) {
      res[node.designerId] = cached;
      continue;
    }

    const db = dbInfos?.[conid]?.[database];

    if (!db) continue;

    const collection = db.collections?.find(x => x.pureName == pureName && x.schemaName == schemaName);
    if (!collection) continue;

    const props: PerspectiveDataLoadProps = {
      databaseConfig: { conid, database },
      engineType: 'docdb',
      pureName,
      orderBy: [],
    };
    const rows = await dataLoader.loadData(props);
    const pattern = analyseDataPattern(
      {
        conid,
        database,
        pureName,
        schemaName,
      },
      rows
    );

    cache.dataPatterns.push(pattern);
    res[node.designerId] = pattern;
  }

  return res;
}

export function usePerspectiveDataPatterns(
  databaseConfig: PerspectiveDatabaseConfig,
  config: PerspectiveConfig,
  cache: PerspectiveCache,
  dbInfos: MultipleDatabaseInfo,
  dataLoader: PerspectiveDataLoader
): Readable<PerspectiveDataPatternDict> {
  const res = writable({});
  getPerspectiveDataPatterns(databaseConfig, config, cache, dbInfos, dataLoader).then(value => res.set(value));
  return res;
}
