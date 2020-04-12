import useFetch from './useFetch';

export default function useViewInfo({ conid, database, schemaName, pureName }) {
  /** @type {import('@dbgate/types').ViewInfo} */
  const viewInfo = useFetch({
    url: 'metadata/view-info',
    params: { conid, database, schemaName, pureName },
    reloadTrigger: `database-structure-changed-${conid}-${database}`,
  });
  return viewInfo;
}
