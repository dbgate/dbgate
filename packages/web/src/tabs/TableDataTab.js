import React from 'react';
import useFetch from '../utility/useFetch';
import styled from 'styled-components';
import theme from '../theme';
import DataGrid from '../datagrid/DataGrid';
import { TableGridDisplay, createGridConfig, createGridCache, createChangeSet } from '@dbgate/datalib';
import { useTableInfo, useConnectionInfo, getTableInfo } from '../utility/metadataLoaders';
import engines from '@dbgate/engines';
import useUndoReducer from '../utility/useUndoReducer';
import usePropsCompare from '../utility/usePropsCompare';
import { useUpdateDatabaseForTab } from '../utility/globalState';

export default function TableDataTab({ conid, database, schemaName, pureName, tabVisible, toolbarPortalRef }) {
  const tableInfo = useTableInfo({ conid, database, schemaName, pureName });
  const [config, setConfig] = React.useState(createGridConfig());
  const [cache, setCache] = React.useState(createGridCache());
  const [changeSetState, dispatchChangeSet] = useUndoReducer(createChangeSet());

  useUpdateDatabaseForTab(tabVisible, conid, database);
  const connection = useConnectionInfo({ conid });
  console.log('GOT CONNECTION', connection);

  // usePropsCompare({ tableInfo, connection, config, cache });

  const display = React.useMemo(
    () =>
      tableInfo && connection
        ? new TableGridDisplay(tableInfo, engines(connection), config, setConfig, cache, setCache, (name) =>
            getTableInfo({ conid, database, ...name })
          )
        : null,
    [tableInfo, connection, config, cache]
  );

  if (!display) return null;

  return (
    <DataGrid
      // key={`${conid}, ${database}, ${schemaName}, ${pureName}`}
      conid={conid}
      database={database}
      display={display}
      tabVisible={tabVisible}
      changeSetState={changeSetState}
      dispatchChangeSet={dispatchChangeSet}
      toolbarPortalRef={toolbarPortalRef}
    />
  );
}
