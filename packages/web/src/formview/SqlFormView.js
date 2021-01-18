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
import stableStringify from 'json-stable-stringify';

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
  // console.log('SqlFormView', props);
  const {
    formDisplay,
    changeSetState,
    dispatchChangeSet,
    conid,
    database,
    onReferenceSourceChanged,
    refReloadToken,
  } = props;
  // const [rowData, setRowData] = React.useState(null);
  // const [reloadToken, setReloadToken] = React.useState(0);
  // const [rowCountInfo, setRowCountInfo] = React.useState(null);
  // const [isLoading, setIsLoading] = React.useState(false);
  // const loadedFiltersRef = React.useRef('');

  const confirmSqlModalState = useModalState();
  const [confirmSql, setConfirmSql] = React.useState('');
  const showModal = useShowModal();

  const changeSet = changeSetState && changeSetState.value;
  const changeSetRef = React.useRef(changeSet);
  changeSetRef.current = changeSet;

  const [loadProps, setLoadProps] = React.useState({
    isLoadingData: false,
    isLoadedData: false,
    rowData: null,
    isLoadingCount: false,
    isLoadedCount: false,
    loadedTime: new Date().getTime(),
    allRowCount: null,
    rowCountBefore: null,
    errorMessage: null,
  });
  const {
    isLoadingData,
    rowData,
    isLoadedData,
    isLoadingCount,
    isLoadedCount,
    loadedTime,
    allRowCount,
    rowCountBefore,
    errorMessage,
  } = loadProps;

  const handleLoadCurrentRow = async () => {
    if (isLoadingData) return;
    let newLoadedRow = false;
    if (formDisplay.config.formViewKeyRequested || formDisplay.config.formViewKey) {
      setLoadProps((oldLoadProps) => ({
        ...oldLoadProps,
        isLoadingData: true,
      }));
      const row = await loadRow(props, formDisplay.getCurrentRowQuery());
      setLoadProps((oldLoadProps) => ({
        ...oldLoadProps,
        isLoadingData: false,
        isLoadedData: true,
        rowData: row,
        loadedTime: new Date().getTime(),
      }));
      newLoadedRow = row;
    }
    if (formDisplay.config.formViewKeyRequested && newLoadedRow) {
      formDisplay.cancelRequestKey(newLoadedRow);
    }
    if (!newLoadedRow && !formDisplay.config.formViewKeyRequested) {
      await handleNavigate('first');
    }
  };

  const handleLoadRowCount = async () => {
    setLoadProps((oldLoadProps) => ({
      ...oldLoadProps,
      isLoadingCount: true,
    }));
    const countRow = await loadRow(props, formDisplay.getCountQuery());
    const countBeforeRow = await loadRow(props, formDisplay.getBeforeCountQuery());

    setLoadProps((oldLoadProps) => ({
      ...oldLoadProps,
      isLoadedCount: true,
      isLoadingCount: false,
      allRowCount: countRow ? parseInt(countRow.count) : null,
      rowCountBefore: countBeforeRow ? parseInt(countBeforeRow.count) : null,
    }));
  };

  const handleNavigate = async (command) => {
    setLoadProps((oldLoadProps) => ({
      ...oldLoadProps,
      isLoadingData: true,
    }));
    const row = await loadRow(props, formDisplay.navigateRowQuery(command));
    if (row) {
      formDisplay.navigate(row);
    }
    setLoadProps((oldLoadProps) => ({
      ...oldLoadProps,
      isLoadingData: false,
      isLoadedData: true,
      isLoadedCount: false,
      allRowCount: null,
      rowCountBefore: null,
      rowData: row,
      loadedTime: new Date().getTime(),
    }));
  };

  React.useEffect(() => {
    if (onReferenceSourceChanged && rowData) onReferenceSourceChanged([rowData], loadedTime);
  }, [onReferenceSourceChanged, rowData, refReloadToken]);

  React.useEffect(() => {
    if (!formDisplay.isLoadedCorrectly) return;
    if (!isLoadedData && !isLoadingData) handleLoadCurrentRow();
    if (isLoadedData && !isLoadingCount && !isLoadedCount) handleLoadRowCount();
  });

  // React.useEffect(() => {
  //   loadedFiltersRef.current = formDisplay ? stableStringify(formDisplay.config) : null;
  // }, [rowData]);

  // React.useEffect(() => {
  //   if (formDisplay) handleLoadCurrentRow();
  //   setRowCountInfo(null);
  //   handleLoadRowCount();
  // }, [reloadToken]);

  // React.useEffect(() => {
  //   if (!formDisplay.isLoadedCorrectly) return;

  //   if (
  //     formDisplay &&
  //     (!formDisplay.isLoadedCurrentRow(rowData) ||
  //       loadedFiltersRef.current != stableStringify(formDisplay.config.filters))
  //   ) {
  //     handleLoadCurrentRow();
  //   }
  //   setRowCountInfo(null);
  //   handleLoadRowCount();
  // }, [formDisplay]);

  const reload = () => {
    setLoadProps({
      isLoadingData: false,
      isLoadedData: false,
      isLoadingCount: false,
      isLoadedCount: false,
      rowData: null,
      loadedTime: new Date().getTime(),
      allRowCount: null,
      rowCountBefore: null,
      errorMessage: null,
    });
  };

  React.useEffect(() => {
    if (props.masterLoadedTime && props.masterLoadedTime > loadedTime) {
      formDisplay.reload();
    }
    if (formDisplay.cache.refreshTime > loadedTime) {
      reload();
    }
  });

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
      formDisplay.reload();
      // setReloadToken((x) => x + 1);
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
        isLoading={isLoadingData}
        onReload={() => formDisplay.reload()}
        onReconnect={async () => {
          await axios.post('database-connections/refresh', { conid, database });
          formDisplay.reload();
        }}
        allRowCount={allRowCount}
        rowCountBefore={rowCountBefore}
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
