import React from 'react';
import useFetch from '../utility/useFetch';
import styled from 'styled-components';
import theme from '../theme';
import DataGrid from '../datagrid/DataGrid';
import { ViewGridDisplay, createGridConfig, createGridCache, createChangeSet } from '@dbgate/datalib';
import { useConnectionInfo, useViewInfo } from '../utility/metadataLoaders';
import engines from '@dbgate/engines';
import useUndoReducer from '../utility/useUndoReducer';
import usePropsCompare from '../utility/usePropsCompare';
import { useUpdateDatabaseForTab } from '../utility/globalState';

export default function ViewDataTab({ conid, database, schemaName, pureName, tabVisible, toolbarPortalRef }) {
  const viewInfo = useViewInfo({ conid, database, schemaName, pureName });
  const [config, setConfig] = React.useState(createGridConfig());
  const [cache, setCache] = React.useState(createGridCache());
  const [changeSetState, dispatchChangeSet] = useUndoReducer(createChangeSet());

  useUpdateDatabaseForTab(tabVisible, conid, database);
  const connection = useConnectionInfo({ conid });

  // usePropsCompare({ tableInfo, connection, config, cache });

  const display = React.useMemo(
    () =>
      viewInfo && connection
        ? new ViewGridDisplay(viewInfo, engines(connection), config, setConfig, cache, setCache)
        : null,
    [viewInfo, connection, config, cache]
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
