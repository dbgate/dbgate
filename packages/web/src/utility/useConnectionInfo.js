import useFetch from './useFetch';

export default function useConnectionInfo(conid) {
  /** @type {import('@dbgate/types').StoredConnection} */
  const connection = useFetch({
    params: { conid },
    url: 'connections/get',
  });
  return connection;
}
