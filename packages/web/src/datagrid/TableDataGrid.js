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
  masterLoadedTime = undefined,
}) {
  const [myConfig, setMyConfig] = React.useState(createGridConfig());
  const [childConfig, setChildConfig] = React.useState(createGridConfig());
  const [myCache, setMyCache] = React.useState(createGridCache());
  const [childCache, setChildCache] = React.useState(createGridCache());
  const [refReloadToken, setRefReloadToken] = React.useState(0);
  const [myLoadedTime, setMyLoadedTime] = React.useState(0);

  const connection = useConnectionInfo({ conid });
  const [reference, setReference] = React.useState(null);

  React.useEffect(() => {
    setRefReloadToken((v) => v + 1);
  }, [reference]);

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

  const handleRefSourcedRowsChanged = React.useCallback(
    (selectedRows, loadedTime) => {
      setMyLoadedTime(loadedTime);
      if (!reference) return;
      const filters = {
        ...(config || myConfig).filters,
        ..._.fromPairs(
          reference.columns.map((col) => [
            col.refName,
            selectedRows.map((x) => getFilterValueExpression(x[col.baseName])).join(','),
          ])
        ),
      };
      if (stableStringify(filters) != stableStringify((config || childConfig).filters)) {
        setChildConfig((cfg) => ({
          ...cfg,
          filters,
        }));
        setChildCache((ca) => ({
          ...ca,
          refreshTime: new Date().getTime(),
        }));
      }
    },
    [config || childConfig, reference]
  );

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
        onRefSourceRowsChanged={reference ? handleRefSourcedRowsChanged : null}
        refReloadToken={refReloadToken.toString()}
        masterLoadedTime={masterLoadedTime}
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
          masterLoadedTime={myLoadedTime}
        />
      )}
    </VerticalSplitter>
  );
}
