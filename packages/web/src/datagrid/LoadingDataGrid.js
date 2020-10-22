import React from 'react';
import axios from '../utility/axios';
import { useSetOpenedTabs } from '../utility/globalState';
import DataGridCore from './DataGridCore';
import useSocket from '../utility/SocketProvider';
import useShowModal from '../modals/showModal';
import ImportExportModal from '../modals/ImportExportModal';
import { getChangeSetInsertedRows } from '@dbgate/datalib';
import ChangeSetDataGrid from './ChangeSetDataGrid';
import { openNewTab } from '../utility/common';

/** @param props {import('./types').LoadingDataGridProps} */
async function loadDataPage(props, offset, limit) {
  const { display, conid, database, jslid } = props;

  if (jslid) {
    const response = await axios.request({
      url: 'jsldata/get-rows',
      method: 'get',
      params: {
        jslid,
        offset,
        limit,
      },
    });
    return response.data;
  }

  const sql = display.getPageQuery(offset, limit);

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
  return response.data.rows;
}

function dataPageAvailable(props) {
  const { display, jslid } = props;
  if (jslid) return true;
  const sql = display.getPageQuery(0, 1);
  return !!sql;
}

/** @param props {import('./types').LoadingDataGridProps} */
async function loadRowCount(props) {
  const { display, conid, database, jslid } = props;

  if (jslid) {
    const response = await axios.request({
      url: 'jsldata/get-stats',
      method: 'get',
      params: {
        jslid,
      },
    });
    return response.data.rowCount;
  }

  const sql = display.getCountQuery();

  const response = await axios.request({
    url: 'database-connections/query-data',
    method: 'post',
    params: {
      conid,
      database,
    },
    data: { sql },
  });

  return parseInt(response.data.rows[0].count);
}

export default function LoadingDataGrid(props) {
  const { conid, database, display, changeSetState, dispatchChangeSet, tabVisible, jslid } = props;

  const [loadProps, setLoadProps] = React.useState({
    isLoading: false,
    loadedRows: [],
    isLoadedAll: false,
    loadedTime: new Date().getTime(),
    allRowCount: null,
    errorMessage: null,
    jslStatsCounter: 0,
    jslChangeIndex: 0,
  });
  const { isLoading, loadedRows, isLoadedAll, loadedTime, allRowCount, errorMessage } = loadProps;
  const showModal = useShowModal();

  const loadedTimeRef = React.useRef(0);

  const changeSet = changeSetState && changeSetState.value;
  const setChangeSet = React.useCallback((value) => dispatchChangeSet({ type: 'set', value }), [dispatchChangeSet]);
  const setOpenedTabs = useSetOpenedTabs();
  const socket = useSocket();

  const changeSetRef = React.useRef(changeSet);

  changeSetRef.current = changeSet;

  const handleLoadRowCount = async () => {
    const rowCount = await loadRowCount(props);
    setLoadProps((oldLoadProps) => ({
      ...oldLoadProps,
      allRowCount: rowCount,
    }));
  };

  const reload = () => {
    setLoadProps({
      allRowCount: null,
      isLoading: false,
      loadedRows: [],
      isLoadedAll: false,
      loadedTime: new Date().getTime(),
      errorMessage: null,
      jslStatsCounter: 0,
      jslChangeIndex: 0,
    });
  };

  function exportGrid() {
    const initialValues = {};
    if (jslid) {
      const archiveMatch = jslid.match(/^archive:\/\/([^/]+)\/(.*)$/);
      if (archiveMatch) {
        initialValues.sourceStorageType = 'archive';
        initialValues.sourceArchiveFolder = archiveMatch[1];
        initialValues.sourceList = [archiveMatch[2]];
      } else {
        initialValues.sourceStorageType = 'jsldata';
        initialValues.sourceJslId = jslid;
        initialValues.sourceList = ['query-data'];
      }
    } else {
      initialValues.sourceStorageType = 'query';
      initialValues.sourceConnectionId = conid;
      initialValues.sourceDatabaseName = database;
      initialValues.sourceSql = display.getExportQuery();
      initialValues.sourceList = display.baseTable ? [display.baseTable.pureName] : [];
    }
    showModal((modalState) => <ImportExportModal modalState={modalState} initialValues={initialValues} />);
  }

  React.useEffect(() => {
    if (props.masterLoadedTime && props.masterLoadedTime > loadedTime) {
      display.reload();
    }
    if (display.cache.refreshTime > loadedTime) {
      reload();
    }
  });

  const loadNextData = async () => {
    if (isLoading) return;
    setLoadProps((oldLoadProps) => ({
      ...oldLoadProps,
      isLoading: true,
    }));
    const loadStart = new Date().getTime();
    loadedTimeRef.current = loadStart;

    const nextRows = await loadDataPage(props, loadedRows.length, 100);
    if (loadedTimeRef.current !== loadStart) {
      // new load was dispatched
      return;
    }
    // if (!_.isArray(nextRows)) {
    //   console.log('Error loading data from server', nextRows);
    //   nextRows = [];
    // }
    // console.log('nextRows', nextRows);
    if (nextRows.errorMessage) {
      setLoadProps((oldLoadProps) => ({
        ...oldLoadProps,
        isLoading: false,
        errorMessage: nextRows.errorMessage,
      }));
    } else {
      if (allRowCount == null) handleLoadRowCount();
      const loadedInfo = {
        loadedRows: [...loadedRows, ...nextRows],
        loadedTime,
      };
      setLoadProps((oldLoadProps) => ({
        ...oldLoadProps,
        isLoading: false,
        isLoadedAll: oldLoadProps.jslStatsCounter == loadProps.jslStatsCounter && nextRows.length === 0,
        ...loadedInfo,
      }));
    }
  };

  const handleJslDataStats = React.useCallback((stats) => {
    if (stats.changeIndex < loadProps.jslChangeIndex) return;
    setLoadProps((oldProps) => ({
      ...oldProps,
      allRowCount: stats.rowCount,
      isLoadedAll: false,
      jslStatsCounter: oldProps.jslStatsCounter + 1,
      jslChangeIndex: stats.changeIndex,
    }));
  }, []);

  React.useEffect(() => {
    if (jslid && socket) {
      socket.on(`jsldata-stats-${jslid}`, handleJslDataStats);
      return () => {
        socket.off(`jsldata-stats-${jslid}`, handleJslDataStats);
      };
    }
  }, [jslid]);

  const insertedRows = getChangeSetInsertedRows(changeSet, display.baseTable);
  const rowCountNewIncluded = loadedRows.length + insertedRows.length;

  const handleLoadNextData = () => {
    if (!isLoadedAll && !errorMessage && insertedRows.length == 0) {
      if (dataPageAvailable(props)) {
        // If not, callbacks to load missing metadata are dispatched
        loadNextData();
      }
    }
  };

  function openQuery() {
    openNewTab(setOpenedTabs, {
      title: 'Query',
      icon: 'sql.svg',
      tabComponent: 'QueryTab',
      props: {
        initialScript: display.getExportQuery(),
        schemaName: display.baseTable.schemaName,
        pureName: display.baseTable.pureName,
        conid,
        database,
      },
    });
  }

  return (
    <ChangeSetDataGrid
      {...props}
      loadNextData={handleLoadNextData}
      errorMessage={errorMessage}
      isLoadedAll={isLoadedAll}
      loadedTime={loadedTime}
      exportGrid={exportGrid}
      allRowCount={allRowCount}
      openQuery={display.baseTable ? openQuery : null}
      isLoading={isLoading}
      rows={loadedRows}
    />
  );
}
