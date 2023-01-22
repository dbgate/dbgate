<script lang="ts" context="module">
  async function loadRow(props, select) {
    const { conid, database } = props;

    if (!select) return null;

    const response = await apiCall('database-connections/sql-select', {
      conid,
      database,
      select,
    });

    if (response.errorMessage) return response;
    return response.rows[0];
  }
</script>

<script lang="ts">
  import FormView from './FormView.svelte';
  import { apiCall } from '../utility/api';
  import ChangeSetGrider from '../datagrid/ChangeSetGrider';
  import _ from 'lodash';

  export let changeSetState;
  export let dispatchChangeSet;
  export let masterLoadedTime;
  export let conid;
  export let database;
  export let onReferenceSourceChanged;
  export let display;

  let isLoadingData = false;
  let isLoadedData = false;
  let rowData = null;
  let isLoadingCount = false;
  let isLoadedCount = false;
  let loadedTime = new Date().getTime();
  let allRowCount = null;
  let rowCountBefore = null;
  let errorMessage = null;

  const handleLoadCurrentRow = async () => {
    if (isLoadingData) return;
    let newLoadedRow = false;
    // if (_.isNumber(display.config.formViewRecordNumber)) {
    isLoadingData = true;
    const row = await loadRow($$props, display.getPageQuery(display.config.formViewRecordNumber || 0, 1));
    isLoadingData = false;
    isLoadedData = true;
    rowData = row;
    loadedTime = new Date().getTime();
    newLoadedRow = row;
    // }
    // if (formDisplay.config.formViewKeyRequested && newLoadedRow) {
    //   formDisplay.cancelRequestKey(newLoadedRow);
    // }
    // if (!newLoadedRow && !formDisplay.config.formViewKeyRequested) {
    //   await handleNavigate('first');
    // }
  };

  const handleLoadRowCount = async () => {
    isLoadingCount = true;
    const countRow = await loadRow($$props, display.getCountQuery());
    // const countBeforeRow = await loadRow($$props, formDisplay.getBeforeCountQuery());

    isLoadedCount = true;
    isLoadingCount = false;
    allRowCount = countRow ? parseInt(countRow.count) : null;
    // rowCountBefore = countBeforeRow ? parseInt(countBeforeRow.count) : null;
  };

  const handleNavigate = async command => {
    display.formViewNavigate(command, allRowCount);

    // isLoadingData = true;
    // const row = await loadRow($$props, formDisplay.navigateRowQuery(command));
    // if (row) {
    //   formDisplay.navigate(row);
    // }
    // isLoadingData = false;
    // isLoadedData = true;
    // isLoadedCount = false;
    // allRowCount = null;
    // rowCountBefore = null;
    // rowData = row;
    // loadedTime = new Date().getTime();
  };

  export function reload() {
    isLoadingData = false;
    isLoadedData = false;
    isLoadingCount = false;
    isLoadedCount = false;
    rowData = null;
    loadedTime = new Date().getTime();
    allRowCount = null;
    rowCountBefore = null;
    errorMessage = null;
  }

  $: {
    if (masterLoadedTime && masterLoadedTime > loadedTime) {
      display.reload();
    }
  }

  $: {
    if (display?.cache?.refreshTime > loadedTime) {
      reload();
    }
  }

  $: {
    if (display?.isLoadedCorrectly) {
      if (!isLoadedData && !isLoadingData) handleLoadCurrentRow();
      if (isLoadedData && !isLoadingCount && !isLoadedCount) handleLoadRowCount();
    }
  }

  $: grider = new ChangeSetGrider(rowData ? [rowData] : [], changeSetState, dispatchChangeSet, display);

  $: if (onReferenceSourceChanged && rowData) onReferenceSourceChanged([rowData], loadedTime);
</script>

<FormView {...$$props} {grider} isLoading={isLoadingData} {allRowCount} onNavigate={handleNavigate} />
