import { createGridCache, createGridConfig, FreeTableGridDisplay } from 'dbgate-datalib';
import React from 'react';
import DataGridCore from '../datagrid/DataGridCore';
import RowsArrayGrider from '../datagrid/RowsArrayGrider';
import axios from '../utility/axios';
import ErrorInfo from '../widgets/ErrorInfo';
import LoadingInfo from '../widgets/LoadingInfo';

export default function PreviewDataGrid({ reader, ...other }) {
  const [isLoading, setIsLoading] = React.useState(false);
  const [errorMessage, setErrorMessage] = React.useState(null);
  const [model, setModel] = React.useState(null);
  const [config, setConfig] = React.useState(createGridConfig());
  const [cache, setCache] = React.useState(createGridCache());
  const [grider, setGrider] = React.useState(null);

  const handleLoadInitialData = async () => {
    try {
      if (!reader) {
        setModel(null);
        setGrider(null);
        return;
      }
      setIsLoading(true);
      const resp = await axios.post('runners/load-reader', reader);
      // @ts-ignore
      setModel(resp.data);
      setGrider(new RowsArrayGrider(resp.data.rows));
      setIsLoading(false);
    } catch (err) {
      setIsLoading(false);
      const errorMessage = (err && err.response && err.response.data && err.response.data.error) || 'Loading failed';
      setErrorMessage(errorMessage);
      console.error(err.response);
    }
  };

  React.useEffect(() => {
    handleLoadInitialData();
  }, [reader]);

  const display = React.useMemo(() => new FreeTableGridDisplay(model, config, setConfig, cache, setCache), [
    model,
    config,
    cache,
    grider,
  ]);

  if (isLoading) {
    return <LoadingInfo wrapper message="Loading data" />;
  }
  if (errorMessage) {
    return <ErrorInfo message={errorMessage} />;
  }

  if (!grider) return null;

  return <DataGridCore {...other} grider={grider} display={display} />;
}
