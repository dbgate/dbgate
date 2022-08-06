import { Readable, writable } from 'svelte/store';
import { getDatabaseInfo } from './metadataLoaders';
import { MultipleDatabaseInfo } from 'dbgate-datalib';

export function useMultipleDatabaseInfo(dbs: { conid: string; database: string }[]): Readable<MultipleDatabaseInfo> {
  const res = writable({});
  for (const { conid, database } of dbs) {
    getDatabaseInfo({ conid, database }).then(dbInfo => {
      res.update(old => ({
        ...old,
        [conid]: {
          ...old[conid],
          [database]: dbInfo,
        },
      }));
    });
  }
  return res;
}
