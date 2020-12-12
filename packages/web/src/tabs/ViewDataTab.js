import React from 'react';
import DataGrid from '../datagrid/DataGrid';
import { ViewGridDisplay, createGridCache, createChangeSet } from 'dbgate-datalib';
import { useConnectionInfo, useViewInfo } from '../utility/metadataLoaders';
import useUndoReducer from '../utility/useUndoReducer';
import usePropsCompare from '../utility/usePropsCompare';
import { useUpdateDatabaseForTab } from '../utility/globalState';
import useGridConfig from '../utility/useGridConfig';
import SqlDataGridCore from '../datagrid/SqlDataGridCore';
import useExtensions from '../utility/useExtensions';
import { findEngineDriver } from 'dbgate-tools';

export default function ViewDataTab({ conid, database, schemaName, pureName, tabVisible, toolbarPortalRef, tabid }) {
  const viewInfo = useViewInfo({ conid, database, schemaName, pureName });
  const [config, setConfig] = useGridConfig(tabid);
  const [cache, setCache] = React.useState(createGridCache());
  const [changeSetState, dispatchChangeSet] = useUndoReducer(createChangeSet());
  const extensions = useExtensions()

  useUpdateDatabaseForTab(tabVisible, conid, database);
  const connection = useConnectionInfo({ conid });

  // usePropsCompare({ tableInfo, connection, config, cache });

  const display = React.useMemo(
    () =>
      viewInfo && connection
        ? new ViewGridDisplay(
            viewInfo,
            findEngineDriver(connection, extensions),
            //@ts-ignore
            config,
            setConfig,
            cache,
            setCache
          )
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
      GridCore={SqlDataGridCore}
      />
  );
}

ViewDataTab.matchingProps = ['conid', 'database', 'schemaName', 'pureName'];
ViewDataTab.allowAddToFavorites = (props) => true;
