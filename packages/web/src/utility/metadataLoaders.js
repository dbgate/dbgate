import useFetch from './useFetch';
import axios from './axios';
import { cacheGet, cacheSet, getCachedPromise } from './cache';
import stableStringify from 'json-stable-stringify';

const tableInfoLoader = ({ conid, database, schemaName, pureName }) => ({
  url: 'metadata/table-info',
  params: { conid, database, schemaName, pureName },
  reloadTrigger: `database-structure-changed-${conid}-${database}`,
});

async function getCore(loader, args) {
  const { url, params, reloadTrigger } = loader(args);
  const key = stableStringify({ url, ...params });

  async function doLoad() {
    const resp = await axios.request({
      method: 'get',
      url,
      params,
    });
    return resp.data;
  }

  const fromCache = cacheGet(key);
  if (fromCache) return fromCache;
  const res = getCachedPromise(key, doLoad);

  cacheSet(key, res, reloadTrigger);
  return res;
}

function useCore(loader, args) {
  const { url, params, reloadTrigger } = loader(args);
  const cacheKey = stableStringify({ url, ...params });

  const res = useFetch({
    url,
    params,
    reloadTrigger,
    cacheKey,
  });

  return res;
}

/** @returns {Promise<import('@dbgate/types').TableInfo>} */
export function getTableInfo(args) {
  return getCore(tableInfoLoader, args);
}

/** @returns {import('@dbgate/types').TableInfo} */
export function useTableInfo(args) {
  return useCore(tableInfoLoader, args);
}
// export const useTableInfo = createUse(tableInfoLoader);

// export async function getTableInfo({ conid, database, schemaName, pureName }) {
//   const resp = await axios.request({
//     method: 'get',
//     url: 'metadata/table-info',
//     params: { conid, database, schemaName, pureName },
//   });
//   /** @type {import('@dbgate/types').TableInfo} */
//   const res = resp.data;
//   return res;
// }

// export function useTableInfo({ conid, database, schemaName, pureName }) {
//   /** @type {import('@dbgate/types').TableInfo} */
//   const tableInfo = useFetch({
//     url: 'metadata/table-info',
//     params: { conid, database, schemaName, pureName },
//     reloadTrigger: `database-structure-changed-${conid}-${database}`,
//   });
//   return tableInfo;
// }

export function useViewInfo({ conid, database, schemaName, pureName }) {
  /** @type {import('@dbgate/types').ViewInfo} */
  const viewInfo = useFetch({
    url: 'metadata/view-info',
    params: { conid, database, schemaName, pureName },
    reloadTrigger: `database-structure-changed-${conid}-${database}`,
  });
  return viewInfo;
}

export function useConnectionInfo(conid) {
  /** @type {import('@dbgate/types').StoredConnection} */
  const connection = useFetch({
    params: { conid },
    url: 'connections/get',
  });
  return connection;
}

export async function getConnectionInfo(conid) {
  const resp = await axios.request({
    method: 'get',
    params: { conid },
    url: 'connections/get',
  });
  /** @type {import('@dbgate/types').StoredConnection} */
  const res = resp.data;
  return res;
}
