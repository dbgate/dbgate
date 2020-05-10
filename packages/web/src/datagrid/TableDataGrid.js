import React from 'react';
import DataGrid from './DataGrid';
import { TableGridDisplay, createGridConfig, createGridCache } from '@dbgate/datalib';
import { useConnectionInfo, getTableInfo } from '../utility/metadataLoaders';
import engines from '@dbgate/engines';
import useSocket from '../utility/SocketProvider';

export default function TableDataGrid({
  conid,
  database,
  schemaName,
  pureName,
  tabVisible,
  toolbarPortalRef,
  cache,
  setCache,
  changeSetState,
  dispatchChangeSet,
}) {
  const [config, setConfig] = React.useState(createGridConfig());

  const connection = useConnectionInfo({ conid });

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
