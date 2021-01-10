import { TableFormViewDisplay } from 'dbgate-datalib';
import { findEngineDriver } from 'dbgate-tools';
import React from 'react';
import { useConnectionInfo, useDatabaseInfo } from '../utility/metadataLoaders';
import useExtensions from '../utility/useExtensions';
import FormView from './FormView';
import axios from '../utility/axios';
import ChangeSetFormer from './ChangeSetFormer';

async function loadRow(props, sql) {
  const { conid, database } = props;
  /** @type {import('dbgate-datalib').TableFormViewDisplay} */
  const formDisplay = props.formDisplay;

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
  const { formDisplay, changeSetState, dispatchChangeSet } = props;
  const [rowData, setRowData] = React.useState(null);

  const handleLoadCurrentRow = async () => {
    const row = await loadRow(props, formDisplay.getCurrentRowQuery());
    if (row) setRowData(row);
  };

  const handleNavigate = async (command) => {
    const row = await loadRow(props, formDisplay.navigateRowQuery(command));
    if (row) {
      setRowData(row);
      formDisplay.navigate(row);
    }
  };

  React.useEffect(() => {
    if (formDisplay && !formDisplay.isLoadedCurrentRow(rowData)) {
      handleLoadCurrentRow();
    }
  }, [formDisplay, rowData]);

  const former = React.useMemo(() => new ChangeSetFormer(rowData, changeSetState, dispatchChangeSet, formDisplay), [
    rowData,
    changeSetState,
    dispatchChangeSet,
    formDisplay,
  ]);

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

  return <FormView {...props} rowData={rowData} onNavigate={handleNavigate} former={former} />;
}
