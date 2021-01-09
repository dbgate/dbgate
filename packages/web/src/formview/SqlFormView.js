import { TableFormViewDisplay } from 'dbgate-datalib';
import { findEngineDriver } from 'dbgate-tools';
import React from 'react';
import { useConnectionInfo, useDatabaseInfo } from '../utility/metadataLoaders';
import useExtensions from '../utility/useExtensions';
import FormView from './FormView';
import axios from '../utility/axios';

async function loadCurrentRow(props) {
  const { formDisplay, conid, database } = props;
  /** @type {import('dbgate-datalib').TableFormViewDisplay} */

  const sql = formDisplay.getCurrentRowQuery();

  const response = await axios.request({
    url: 'database-connections/query-data',
    method: 'post',
    params: {
      conid,
      database,
    },
    data: { sql },
  });

  if (response.data.errorMessage) return response.data;
  return response.data.rows[0];
}

export default function SqlFormView(props) {
  const { formDisplay } = props;
  const [rowData, setRowData] = React.useState(null);

  const handleLoadCurrentRow = async () => {
    const row = await loadCurrentRow(props);
    if (row) setRowData(row);
  };

  React.useEffect(() => {
    handleLoadCurrentRow();
  }, [formDisplay]);

  // const { config, setConfig, cache, setCache, schemaName, pureName, conid, database } = props;
  // const { formViewKey } = config;

  // const [display, setDisplay] = React.useState(null);

  // const connection = useConnectionInfo({ conid });
  // const dbinfo = useDatabaseInfo({ conid, database });
  // const extensions = useExtensions();

  // console.log('SqlFormView.props', props);

  // React.useEffect(() => {
  //   const newDisplay = connection
  //     ? new TableFormViewDisplay(
  //         { schemaName, pureName },
  //         findEngineDriver(connection, extensions),
  //         config,
  //         setConfig,
  //         cache,
  //         setCache,
  //         dbinfo
  //       )
  //     : null;
  //   if (!newDisplay) return;
  //   if (display && display.isLoadedCorrectly && !newDisplay.isLoadedCorrectly) return;
  //   setDisplay(newDisplay);
  // }, [config, cache, conid, database, schemaName, pureName, dbinfo, extensions]);

  return <FormView {...props} rowData={rowData} />;
}
