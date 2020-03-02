import useFetch from './useFetch';

export default function useTableInfo({ conid, database, schemaName, pureName }) {
  /** @type {import('@dbgate/types').TableInfo} */
  const tableInfo = useFetch({
    url: 'tables/table-info',
    params: { conid, database, schemaName, pureName },
  });
  return tableInfo;
}
