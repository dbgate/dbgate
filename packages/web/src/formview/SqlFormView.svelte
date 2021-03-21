<script lang="ts" context="module">
  async function loadRow(props, sql) {
    const { conid, database } = props;

    if (!sql) return null;

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
    return response.data.rows[0];
  }
</script>

<script lang="ts">
  import axiosInstance from '../utility/axiosInstance';
  import ChangeSetFormer from './ChangeSetFormer';
  import FormView from './FormView.svelte';

  export let formDisplay;
  export let changeSetState;
  export let dispatchChangeSet;
  export let masterLoadedTime;

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
    if (formDisplay.config.formViewKeyRequested || formDisplay.config.formViewKey) {
      isLoadingData = true;
      const row = await loadRow($$props, formDisplay.getCurrentRowQuery());
      isLoadingData = false;
      isLoadedData = true;
      rowData = row;
      loadedTime = new Date().getTime();
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
    isLoadingCount = true;
    const countRow = await loadRow($$props, formDisplay.getCountQuery());
    const countBeforeRow = await loadRow($$props, formDisplay.getBeforeCountQuery());

    isLoadedCount = true;
    isLoadingCount = false;
    allRowCount = countRow ? parseInt(countRow.count) : null;
    rowCountBefore = countBeforeRow ? parseInt(countBeforeRow.count) : null;
  };

  const handleNavigate = async command => {
    isLoadingData = true;
    const row = await loadRow($$props, formDisplay.navigateRowQuery(command));
    if (row) {
      formDisplay.navigate(row);
    }
    isLoadingData = false;
    isLoadedData = true;
    isLoadedCount = false;
    allRowCount = null;
    rowCountBefore = null;
    rowData = row;
    loadedTime = new Date().getTime();
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
      formDisplay.reload();
    }
  }

  $: {
    if (formDisplay.cache.refreshTime > loadedTime) {
      reload();
    }
  }

  $: {
    if (formDisplay.isLoadedCorrectly) {
      if (!isLoadedData && !isLoadingData) handleLoadCurrentRow();
      if (isLoadedData && !isLoadingCount && !isLoadedCount) handleLoadRowCount();
    }
  }

  $: former = new ChangeSetFormer(rowData, changeSetState, dispatchChangeSet, formDisplay);
</script>

<FormView {...$$props} {former} isLoading={isLoadingData} {allRowCount} {rowCountBefore} />
