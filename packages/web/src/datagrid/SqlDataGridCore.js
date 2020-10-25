import React from 'react';
import axios from '../utility/axios';
import { useSetOpenedTabs } from '../utility/globalState';
import DataGridCore from './DataGridCore';
import useSocket from '../utility/SocketProvider';
import useShowModal from '../modals/showModal';
import ImportExportModal from '../modals/ImportExportModal';
import { changeSetToSql, createChangeSet, getChangeSetInsertedRows } from '@dbgate/datalib';
import { openNewTab } from '../utility/common';
import LoadingDataGridCore from './LoadingDataGridCore';
import ChangeSetGrider from './ChangeSetGrider';
import { scriptToSql } from '@dbgate/sqltree';
import useModalState from '../modals/useModalState';
import ConfirmSqlModal from '../modals/ConfirmSqlModal';
import ErrorMessageModal from '../modals/ErrorMessageModal';

/** @param props {import('./types').DataGridProps} */
async function loadDataPage(props, offset, limit) {
  const { display, conid, database } = props;

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
  const { display } = props;
  const sql = display.getPageQuery(0, 1);
  return !!sql;
}

async function loadRowCount(props) {
  const { display, conid, database } = props;

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

/** @param props {import('./types').DataGridProps} */
export default function SqlDataGridCore(props) {
  const { conid, database, display, changeSetState, dispatchChangeSet, tabVisible } = props;
  const showModal = useShowModal();
  const setOpenedTabs = useSetOpenedTabs();

  const confirmSqlModalState = useModalState();
  const [confirmSql, setConfirmSql] = React.useState('');

  const changeSet = changeSetState && changeSetState.value;
  const changeSetRef = React.useRef(changeSet);
  changeSetRef.current = changeSet;

  function exportGrid() {
    const initialValues = {};
    initialValues.sourceStorageType = 'query';
    initialValues.sourceConnectionId = conid;
    initialValues.sourceDatabaseName = database;
    initialValues.sourceSql = display.getExportQuery();
    initialValues.sourceList = display.baseTable ? [display.baseTable.pureName] : [];
    showModal((modalState) => <ImportExportModal modalState={modalState} initialValues={initialValues} />);
  }
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

  function handleSave() {
    const script = changeSetToSql(changeSetRef.current, display.dbinfo);
    const sql = scriptToSql(display.driver, script);
    setConfirmSql(sql);
    confirmSqlModalState.open();
  }

  async function handleConfirmSql() {
    const resp = await axios.request({
      url: 'database-connections/query-data',
      method: 'post',
      params: {
        conid,
        database,
      },
      data: { sql: confirmSql },
    });
    const { errorMessage } = resp.data || {};
    if (errorMessage) {
      showModal((modalState) => (
        <ErrorMessageModal modalState={modalState} message={errorMessage} title="Error when saving" />
      ));
    } else {
      dispatchChangeSet({ type: 'reset', value: createChangeSet() });
      setConfirmSql(null);
      display.reload();
    }
  }

  // const grider = React.useMemo(()=>new ChangeSetGrider())

  return (
    <>
      <LoadingDataGridCore
        {...props}
        exportGrid={exportGrid}
        openQuery={openQuery}
        loadDataPage={loadDataPage}
        dataPageAvailable={dataPageAvailable}
        loadRowCount={loadRowCount}
        griderFactory={ChangeSetGrider.factory}
        griderFactoryDeps={ChangeSetGrider.factoryDeps}
        // changeSet={changeSetState && changeSetState.value}
        onSave={handleSave}
      />
      <ConfirmSqlModal
        modalState={confirmSqlModalState}
        sql={confirmSql}
        engine={display.engine}
        onConfirm={handleConfirmSql}
      />
    </>
  );
}
