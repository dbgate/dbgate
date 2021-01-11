import { changeSetToSql, createChangeSet, TableFormViewDisplay } from 'dbgate-datalib';
import { findEngineDriver } from 'dbgate-tools';
import React from 'react';
import { useConnectionInfo, useDatabaseInfo } from '../utility/metadataLoaders';
import useExtensions from '../utility/useExtensions';
import FormView from './FormView';
import axios from '../utility/axios';
import ChangeSetFormer from './ChangeSetFormer';
import ConfirmSqlModal from '../modals/ConfirmSqlModal';
import ErrorMessageModal from '../modals/ErrorMessageModal';
import { scriptToSql } from 'dbgate-sqltree';
import useModalState from '../modals/useModalState';
import useShowModal from '../modals/showModal';

async function loadRow(props, sql) {
  const { conid, database } = props;

  if (!sql) return null;

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
  return response.data.rows[0];
}

export default function SqlFormView(props) {
  const { formDisplay, changeSetState, dispatchChangeSet, conid, database } = props;
  const [rowData, setRowData] = React.useState(null);
  const [reloadToken, setReloadToken] = React.useState(0);
  const [rowCountInfo, setRowCountInfo] = React.useState(null);

  const confirmSqlModalState = useModalState();
  const [confirmSql, setConfirmSql] = React.useState('');
  const showModal = useShowModal();

  const changeSet = changeSetState && changeSetState.value;
  const changeSetRef = React.useRef(changeSet);
  changeSetRef.current = changeSet;

  const handleLoadCurrentRow = async () => {
    const row = await loadRow(props, formDisplay.getCurrentRowQuery());
    if (row) setRowData(row);
  };

  const handleLoadRowCount = async () => {
    const countRow = await loadRow(props, formDisplay.getCountQuery());
    const countBeforeRow = await loadRow(props, formDisplay.getBeforeCountQuery());

    if (countRow && countBeforeRow) {
      setRowCountInfo({
        allRowCount: parseInt(countRow.count),
        rowCountBefore: parseInt(countBeforeRow.count),
      });
    }
  };

  const handleNavigate = async (command) => {
    const row = await loadRow(props, formDisplay.navigateRowQuery(command));
    if (row) {
      setRowData(row);
      formDisplay.navigate(row);
    }
  };

  React.useEffect(() => {
    if (formDisplay) handleLoadCurrentRow();
    setRowCountInfo(null);
    handleLoadRowCount();
  }, [reloadToken]);

  React.useEffect(() => {
    if (!formDisplay.isLoadedCorrectly) return;

    if (formDisplay && !formDisplay.isLoadedCurrentRow(rowData)) {
      handleLoadCurrentRow();
    }
    setRowCountInfo(null);
    handleLoadRowCount();
  }, [formDisplay]);

  const former = React.useMemo(() => new ChangeSetFormer(rowData, changeSetState, dispatchChangeSet, formDisplay), [
    rowData,
    changeSetState,
    dispatchChangeSet,
    formDisplay,
  ]);

  function handleSave() {
    const script = changeSetToSql(changeSetRef.current, formDisplay.dbinfo);
    const sql = scriptToSql(formDisplay.driver, script);
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
      setReloadToken((x) => x + 1);
    }
  }

  // const { config, setConfig, cache, setCache, schemaName, pureName, conid, database } = props;
  // const { formViewKey } = config;

  // const [display, setDisplay] = React.useState(null);

  // const connection = useConnectionInfo({ conid });
  // const dbinfo = useDatabaseInfo({ conid, database });
  // const extensions = useExtensions();

  // console.log('SqlFormView.props', props);

  // React.useEffect(() => {
  //   const newDisplay = connection
  //     ? new TableFormViewDisplay(
  //         { schemaName, pureName },
  //         findEngineDriver(connection, extensions),
  //         config,
  //         setConfig,
  //         cache,
  //         setCache,
  //         dbinfo
  //       )
  //     : null;
  //   if (!newDisplay) return;
  //   if (display && display.isLoadedCorrectly && !newDisplay.isLoadedCorrectly) return;
  //   setDisplay(newDisplay);
  // }, [config, cache, conid, database, schemaName, pureName, dbinfo, extensions]);

  return (
    <>
      <FormView
        {...props}
        rowData={rowData}
        onNavigate={handleNavigate}
        former={former}
        onSave={handleSave}
        onReload={() => setReloadToken((x) => x + 1)}
        onReconnect={async () => {
          await axios.post('database-connections/refresh', { conid, database });
          formDisplay.reload();
        }}
        {...rowCountInfo}
      />
      <ConfirmSqlModal
        modalState={confirmSqlModalState}
        sql={confirmSql}
        engine={formDisplay.engine}
        onConfirm={handleConfirmSql}
      />
    </>
  );
}
