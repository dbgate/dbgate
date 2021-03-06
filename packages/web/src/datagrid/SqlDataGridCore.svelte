<script context="module" lang="ts">
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
</script>

<script lang="ts">
  import { changeSetToSql, createChangeSet } from 'dbgate-datalib';
  import { scriptToSql } from 'dbgate-sqltree';
  import ConfirmSqlModal from '../modals/ConfirmSqlModal.svelte';
  import ErrorMessageModal from '../modals/ErrorMessageModal.svelte';
  import { showModal } from '../modals/modalTools';

  import axios from '../utility/axios';
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
    const resp = await axios.request({
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
    showModal(ConfirmSqlModal, { sql, onConfirm: () => handleConfirmSql(sql) });
  }
</script>

<LoadingDataGridCore
  {...$$props}
  {loadDataPage}
  {dataPageAvailable}
  {loadRowCount}
  bind:loadedRows
  {grider}
  onSave={handleSave}
/>
