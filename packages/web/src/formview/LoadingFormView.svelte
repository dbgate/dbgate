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

  export let loadRowFunc;
  export let loadRowCountFunc;

  let isLoadingData = false;
  let isLoadedData = false;
  let rowData = null;
  let isLoadingCount = false;
  let isLoadedCount = false;
  let loadedTime = new Date().getTime();
  let allRowCount = null;
  let errorMessage = null;

  const handleLoadCurrentRow = async () => {
    if (isLoadingData) return;
    let newLoadedRow = false;
    isLoadingData = true;
    const row = await loadRowFunc(display.config.formViewRecordNumber || 0);
    isLoadingData = false;
    isLoadedData = true;
    rowData = row;
    loadedTime = new Date().getTime();
    newLoadedRow = row;
  };

  const handleLoadRowCount = async () => {
    isLoadingCount = true;
    allRowCount = await loadRowCountFunc();
    isLoadedCount = true;
    isLoadingCount = false;
  };

  const handleNavigate = async command => {
    display.formViewNavigate(command, allRowCount);
  };

  export function reload() {
    isLoadingData = false;
    isLoadedData = false;
    isLoadingCount = false;
    isLoadedCount = false;
    rowData = null;
    loadedTime = new Date().getTime();
    allRowCount = null;
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
