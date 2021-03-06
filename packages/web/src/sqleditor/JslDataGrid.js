import React from 'react';
import DataGrid from '../datagrid/DataGrid';
import { JslGridDisplay, createGridConfig, createGridCache } from 'dbgate-datalib';
import useFetch from '../utility/useFetch';
import JslDataGridCore from '../datagrid/JslDataGridCore';

export default function JslDataGrid({ jslid }) {
  const info = useFetch({
    params: { jslid },
    url: 'jsldata/get-info',
    defaultValue: {},
  });
  const columns = (info && info.columns) || [];
  const [config, setConfig] = React.useState(createGridConfig());
  const [cache, setCache] = React.useState(createGridCache());
  const display = React.useMemo(() => new JslGridDisplay(jslid, columns, config, setConfig, cache, setCache), [
    jslid,
    columns,
    config,
    cache,
  ]);

  return <DataGrid display={display} jslid={jslid} GridCore={JslDataGridCore} />;
}
