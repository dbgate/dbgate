import axios from './axios';

export default async function getConnectionInfo(conid) {
  const resp = await axios.request({
    method: 'get',
    params: { conid },
    url: 'connections/get',
  });
  /** @type {import('@dbgate/types').StoredConnection} */
  const res = resp.data;
  return res;
}
