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
import useSocket from '../utility/SocketProvider';

export default function TableDataTab({ conid, database, schemaName, pureName, tabVisible, toolbarPortalRef }) {
  const [config, setConfig] = React.useState(createGridConfig());
  const [cache, setCache] = React.useState(createGridCache());
  const [changeSetState, dispatchChangeSet] = useUndoReducer(createChangeSet());
  useUpdateDatabaseForTab(tabVisible, conid, database);
  const connection = useConnectionInfo({ conid });
  // console.log('GOT CONNECTION', connection);

  // usePropsCompare({ tableInfo, connection, config, cache });

  const display = React.useMemo(
    () =>
      connection
        ? new TableGridDisplay(
            { schemaName, pureName },
            engines(connection),
            config,
            setConfig,
            cache,
            setCache,
            (name) => getTableInfo({ conid, database, ...name })
          )
        : null,
    [connection, config, cache]
  );

  const handleDatabaseStructureChanged = React.useCallback(() => {
    setCache(createGridCache());
  }, []);

  const socket = useSocket();

  React.useEffect(() => {
    if (display && !display.isLoadedCorrectly) {
      if (conid && socket) {
        socket.on(`database-structure-changed-${conid}-${database}`, handleDatabaseStructureChanged);
        return () => {
          socket.off(`database-structure-changed-${conid}-${database}`, handleDatabaseStructureChanged);
        };
      }
    }
  }, [conid, database, display]);

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
