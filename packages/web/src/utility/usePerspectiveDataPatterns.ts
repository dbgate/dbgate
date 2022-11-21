import { analyseDataPattern, PerspectiveCache } from 'dbgate-datalib';
import type {
  MultipleDatabaseInfo,
  PerspectiveConfig,
  PerspectiveDatabaseConfig,
  PerspectiveDataLoadProps,
  PerspectiveDataPatternDict,
} from 'dbgate-datalib';
import type { PerspectiveDataLoader } from 'dbgate-datalib/lib/PerspectiveDataLoader';
import { writable } from 'svelte/store';
import type { Readable } from 'svelte/store';

export function getPerspectiveDataPatternsFromCache(
  databaseConfig: PerspectiveDatabaseConfig,
  config: PerspectiveConfig,
  cache: PerspectiveCache,
  dbInfos: MultipleDatabaseInfo
): PerspectiveDataPatternDict {
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
    }
  }

  return res;
}

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

    const table = db.tables?.find(x => x.pureName == pureName && x.schemaName == schemaName);
    const view = db.views?.find(x => x.pureName == pureName && x.schemaName == schemaName);
    const collection = db.collections?.find(x => x.pureName == pureName && x.schemaName == schemaName);
    if (!table && !view && !collection) continue;

    // console.log('LOAD PATTERN FOR', pureName);

    const props: PerspectiveDataLoadProps = {
      databaseConfig: { conid, database },
      engineType: collection ? 'docdb' : 'sqldb',
      schemaName,
      pureName,
      orderBy: table?.primaryKey
        ? table?.primaryKey.columns.map(x => ({ columnName: x.columnName, order: 'ASC' }))
        : table || view
        ? [{ columnName: (table || view).columns[0].columnName, order: 'ASC' }]
        : null,
      range: {
        offset: 0,
        limit: 10,
      },
    };
    // console.log('LOAD PROPS', props);
    const rows = await dataLoader.loadData(props);

    if (rows.errorMessage) {
      console.error('Error loading pattern for', pureName, ':', rows.errorMessage);
      continue;
    }

    // console.log('PATTERN ROWS', rows);

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
  const cached = getPerspectiveDataPatternsFromCache(databaseConfig, config, cache, dbInfos);
  const promise = getPerspectiveDataPatterns(databaseConfig, config, cache, dbInfos, dataLoader);
  const res = writable(cached);
  promise.then(value => res.set(value));
  return res;
}
