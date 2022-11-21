import { derived } from 'svelte/store';
import type { Readable } from 'svelte/store';
import { useDatabaseInfo } from './metadataLoaders';
import type { MultipleDatabaseInfo } from 'dbgate-datalib';

export function useMultipleDatabaseInfo(dbs: { conid: string; database: string }[]): Readable<MultipleDatabaseInfo> {
  return derived(
    dbs.map(db => useDatabaseInfo(db)),
    values => {
      let res = {};
      for (let i = 0; i < dbs.length; i++) {
        const { conid, database } = dbs[i];
        const dbInfo = values[i];
        res = {
          ...res,
          [conid]: {
            ...res[conid],
            [database]: dbInfo,
          },
        };
      }
      return res;
    }
  );
}
