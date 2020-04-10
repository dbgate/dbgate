import React from 'react';
import DataGrid from '../datagrid/DataGrid';
import { JslGridDisplay, createGridConfig, createGridCache } from '@dbgate/datalib';
import useFetch from '../utility/useFetch';

export default function JslDataGrid({ jslid }) {
  const columns = useFetch({
    params: { jslid },
    url: 'jsldata/get-info',
    defaultValue: [],
  });
  const [config, setConfig] = React.useState(createGridConfig());
  const [cache, setCache] = React.useState(createGridCache());
  const display = React.useMemo(() => new JslGridDisplay(jslid, columns, config, setConfig, cache, setCache), [
    jslid,
    columns,
    config,
    cache,
  ]);

  return <DataGrid display={display} jslid={jslid} />;
}
