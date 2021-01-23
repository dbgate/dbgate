import React from 'react';
import axios from '../utility/axios';
import { useSetOpenedTabs } from '../utility/globalState';
import useSocket from '../utility/SocketProvider';
import useShowModal from '../modals/showModal';
import ImportExportModal from '../modals/ImportExportModal';
import LoadingDataGridCore from './LoadingDataGridCore';
import RowsArrayGrider from './RowsArrayGrider';

async function loadDataPage(props, offset, limit) {
  const { jslid, display } = props;

  const response = await axios.post('jsldata/get-rows', {
    jslid,
    offset,
    limit,
    filters: display ? display.compileFilters() : null,
  });

  return response.data;
}

function dataPageAvailable(props) {
  return true;
}

async function loadRowCount(props) {
  const { jslid } = props;

  const response = await axios.request({
    url: 'jsldata/get-stats',
    method: 'get',
    params: {
      jslid,
    },
  });
  return response.data.rowCount;
}

export default function JslDataGridCore(props) {
  const { jslid } = props;
  const [changeIndex, setChangeIndex] = React.useState(0);
  const [rowCountLoaded, setRowCountLoaded] = React.useState(null);

  const showModal = useShowModal();

  const setOpenedTabs = useSetOpenedTabs();
  const socket = useSocket();

  function exportGrid() {
    const initialValues = {};
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
    showModal(modalState => <ImportExportModal modalState={modalState} initialValues={initialValues} />);
  }

  const handleJslDataStats = React.useCallback(
    stats => {
      if (stats.changeIndex < changeIndex) return;
      setChangeIndex(stats.changeIndex);
      setRowCountLoaded(stats.rowCount);
    },
    [changeIndex]
  );

  React.useEffect(() => {
    if (jslid && socket) {
      socket.on(`jsldata-stats-${jslid}`, handleJslDataStats);
      return () => {
        socket.off(`jsldata-stats-${jslid}`, handleJslDataStats);
      };
    }
  }, [jslid]);

  return (
    <LoadingDataGridCore
      {...props}
      exportGrid={exportGrid}
      loadDataPage={loadDataPage}
      dataPageAvailable={dataPageAvailable}
      loadRowCount={loadRowCount}
      rowCountLoaded={rowCountLoaded}
      loadNextDataToken={changeIndex}
      onReload={() => setChangeIndex(0)}
      griderFactory={RowsArrayGrider.factory}
      griderFactoryDeps={RowsArrayGrider.factoryDeps}
    />
  );
}
