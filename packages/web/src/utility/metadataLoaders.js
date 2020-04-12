import useFetch from './useFetch';
import axios from './axios';

// /** @returns {import('@dbgate/types').TableInfo} */
// function makeTableInfo(x) {
//   return x;
// }

// const tableInfoLoader = ({ conid, database, schemaName, pureName }) => ({
//   url: 'metadata/table-info',
//   params: { conid, database, schemaName, pureName },
//   reloadTrigger: `database-structure-changed-${conid}-${database}`,
//   type: makeTableInfo,
// });

// function createGet(loader) {
//   return async (args) => {
//     const { url, params, reloadTrigger, type } = loader(args);
//     const resp = await axios.request({
//       method: 'get',
//       url,
//       params,
//     });
//     return type(resp.data);
//   };
// }

// function createUse(loader) {
//   return async (args) => {
//     const { url, params, reloadTrigger, type } = loader(args);

//     const res = useFetch({
//       url,
//       params,
//       reloadTrigger,
//     });
//     return type(res);
//   };
// }

// export const getTableInfo = createGet(tableInfoLoader);
// export const useTableInfo = createUse(tableInfoLoader);

export async function getTableInfo({ conid, database, schemaName, pureName }) {
  const resp = await axios.request({
    method: 'get',
    url: 'metadata/table-info',
    params: { conid, database, schemaName, pureName },
  });
  /** @type {import('@dbgate/types').TableInfo} */
  const res = resp.data;
  return res;
}

export function useTableInfo({ conid, database, schemaName, pureName }) {
  /** @type {import('@dbgate/types').TableInfo} */
  const tableInfo = useFetch({
    url: 'metadata/table-info',
    params: { conid, database, schemaName, pureName },
    reloadTrigger: `database-structure-changed-${conid}-${database}`,
  });
  return tableInfo;
}

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
