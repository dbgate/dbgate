<script context="module" lang="ts">
  async function loadDataPage(props, offset, limit) {
    const { display, conid, database } = props;

    const sql = display.getPageQuery(offset, limit);

    const response = await axiosInstance.request({
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

    const response = await axiosInstance.request({
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
</script>

<script lang="ts">
  import { changeSetToSql, createChangeSet } from 'dbgate-datalib';
  import { scriptToSql } from 'dbgate-sqltree';
  import ConfirmSqlModal from '../modals/ConfirmSqlModal.svelte';
  import ErrorMessageModal from '../modals/ErrorMessageModal.svelte';
  import ImportExportModal from '../modals/ImportExportModal.svelte';
  import { showModal } from '../modals/modalTools';

  import axiosInstance from '../utility/axiosInstance';
  import openNewTab from '../utility/openNewTab';
  import ChangeSetGrider from './ChangeSetGrider';

  import LoadingDataGridCore from './LoadingDataGridCore.svelte';

  export let conid;
  export let display;
  export let database;
  export let schemaName;
  export let pureName;
  export let config;
  export let changeSetState;
  export let dispatchChangeSet;

  let loadedRows = [];

  // $: console.log('loadedRows BIND', loadedRows);
  $: grider = new ChangeSetGrider(loadedRows, changeSetState, dispatchChangeSet, display);
  // $: console.log('GRIDER', grider);

  async function handleConfirmSql(sql) {
    const resp = await axiosInstance.request({
      url: 'database-connections/query-data',
      method: 'post',
      params: {
        conid,
        database,
      },
      data: { sql },
    });
    const { errorMessage } = resp.data || {};
    if (errorMessage) {
      showModal(ErrorMessageModal, { title: 'Error when saving', message: errorMessage });
    } else {
      dispatchChangeSet({ type: 'reset', value: createChangeSet() });
      display.reload();
    }
  }

  function handleSave() {
    const script = changeSetToSql(changeSetState && changeSetState.value, display.dbinfo);
    const sql = scriptToSql(display.driver, script);
    showModal(ConfirmSqlModal, {
      sql,
      onConfirm: () => handleConfirmSql(sql),
      engine: display.engine,
    });
  }

  function exportGrid() {
    const initialValues: any = {};
    initialValues.sourceStorageType = 'query';
    initialValues.sourceConnectionId = conid;
    initialValues.sourceDatabaseName = database;
    initialValues.sourceSql = display.getExportQuery();
    initialValues.sourceList = display.baseTable ? [display.baseTable.pureName] : [];
    showModal(ImportExportModal, { initialValues });
  }

  function openQuery() {
    openNewTab(
      {
        title: 'Query #',
        icon: 'img sql-file',
        tabComponent: 'QueryTab',
        props: {
          schemaName: display.baseTable.schemaName,
          pureName: display.baseTable.pureName,
          conid,
          database,
        },
      },
      {
        editor: display.getExportQuery(),
      }
    );
  }

  function openActiveChart() {
    openNewTab(
      {
        title: 'Chart #',
        icon: 'img chart',
        tabComponent: 'ChartTab',
        props: {
          conid,
          database,
        },
      },
      {
        editor: {
          config: { chartType: 'bar' },
          sql: display.getExportQuery(select => {
            select.orderBy = null;
          }),
        },
      }
    );
  }
</script>

<LoadingDataGridCore
  {...$$props}
  {loadDataPage}
  {dataPageAvailable}
  {loadRowCount}
  onExportGrid={exportGrid}
  onOpenQuery={openQuery}
  onOpenActiveChart={openActiveChart}
  bind:loadedRows
  {grider}
  onSave={handleSave}
/>
