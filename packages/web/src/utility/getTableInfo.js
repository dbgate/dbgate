import axios from './axios';

export default async function getTableInfo({ conid, database, schemaName, pureName }) {
  const resp = await axios.request({
    method: 'get',
    url: 'tables/table-info',
    params: { conid, database, schemaName, pureName },
  });
  /** @type {import('@dbgate/types').TableInfo} */
  const res = resp.data;
  return res;
}
