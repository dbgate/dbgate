import React from 'react';
import _ from 'lodash';
import DataGrid from './DataGrid';
import { TableGridDisplay, createGridConfig, createGridCache } from '@dbgate/datalib';
import { getFilterValueExpression } from '@dbgate/filterparser';
import { useConnectionInfo, getTableInfo } from '../utility/metadataLoaders';
import engines from '@dbgate/engines';
import useSocket from '../utility/SocketProvider';
import { VerticalSplitter } from '../widgets/Splitter';
import stableStringify from 'json-stable-stringify';

export default function TableDataGrid({
  conid,
  database,
  schemaName,
  pureName,
  tabVisible,
  toolbarPortalRef,
  changeSetState,
  dispatchChangeSet,
  config = undefined,
  setConfig = undefined,
  cache = undefined,
  setCache = undefined,
}) {
  const [myConfig, setMyConfig] = React.useState(createGridConfig());
  const [childConfig, setChildConfig] = React.useState(createGridConfig());
  const [myCache, setMyCache] = React.useState(createGridCache());
  const [childCache, setChildCache] = React.useState(createGridCache());

  const connection = useConnectionInfo({ conid });
  const [reference, setReference] = React.useState(null);

  const display = React.useMemo(
    () =>
      connection
        ? new TableGridDisplay(
            { schemaName, pureName },
            engines(connection),
            config || myConfig,
            setConfig || setMyConfig,
            cache || myCache,
            setCache || setMyCache,
            (name) => getTableInfo({ conid, database, ...name })
          )
        : null,
    [connection, config || myConfig, cache || myCache, conid, database, schemaName, pureName]
  );

  const handleDatabaseStructureChanged = React.useCallback(() => {
    (setCache || setMyCache)(createGridCache());
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

  const handleSelectedRowsChanged = (selectedRows) => {
    const filters = {
      ...(config || myConfig).filters,
      ..._.fromPairs(
        reference.columns.map((col) => [
          col.refName,
          selectedRows.map((x) => getFilterValueExpression(x[col.baseName])).join(','),
        ])
      ),
    };
    if (stableStringify(filters) != stableStringify((config || myConfig).filters)) {
      setChildConfig((cfg) => ({
        ...cfg,
        filters,
      }));
      setChildCache((ca) => ({
        ...ca,
        refreshTime: new Date().getTime(),
      }));
    }
  };

  if (!display) return null;

  return (
    <VerticalSplitter>
      <DataGrid
        // key={`${conid}, ${database}, ${schemaName}, ${pureName}`}
        conid={conid}
        database={database}
        display={display}
        tabVisible={tabVisible}
        changeSetState={changeSetState}
        dispatchChangeSet={dispatchChangeSet}
        toolbarPortalRef={toolbarPortalRef}
        showReferences
        onReferenceClick={setReference}
        onSelectedRowsChanged={reference ? handleSelectedRowsChanged : null}
      />
      {reference && (
        <TableDataGrid
          key={`${reference.schemaName}.${reference.pureName}`}
          conid={conid}
          database={database}
          pureName={reference.pureName}
          schemaName={reference.schemaName}
          changeSetState={changeSetState}
          dispatchChangeSet={dispatchChangeSet}
          toolbarPortalRef={toolbarPortalRef}
          tabVisible={false}
          config={childConfig}
          setConfig={setChildConfig}
          cache={childCache}
          setCache={setChildCache}
        />
      )}
    </VerticalSplitter>
  );
}
