<script lang="ts" context="module">
  let lastFocusedEditor = null;
  const getCurrentEditor = () =>
    lastFocusedEditor?.getTabId && lastFocusedEditor?.getTabId() == getActiveTabId() ? lastFocusedEditor : null;

  registerCommand({
    id: 'dataJson.switchToTable',
    category: 'Data Json',
    name: 'Switch to table',
    keyText: 'F4',
    testEnabled: () => getCurrentEditor() != null,
    onClick: () => getCurrentEditor().switchToTable(),
  });
</script>

<script lang="ts">
  import _ from 'lodash';

  import { getContext, onMount } from 'svelte';
  import { get_current_component } from 'svelte/internal';
  import invalidateCommands from '../commands/invalidateCommands';
  import registerCommand from '../commands/registerCommand';
  import ChangeSetGrider from '../datagrid/ChangeSetGrider';

  import { loadCollectionDataPage } from '../datagrid/CollectionDataGridCore.svelte';
  import LoadingInfo from '../elements/LoadingInfo.svelte';
  import Pager from '../elements/Pager.svelte';

  import { getActiveTabId } from '../stores';
  import contextMenu from '../utility/contextMenu';
  import CollectionJsonRow from './CollectionJsonRow.svelte';

  export let conid;
  export let database;
  export let cache;
  export let display;
  export let setConfig;

  export let changeSetState;
  export let dispatchChangeSet;

  const instance = get_current_component();
  const tabVisible: any = getContext('tabVisible');
  const tabid = getContext('tabid');

  let isLoading = false;
  let loadedTime = null;

  export let loadedRows = [];
  let skip = 0;
  let limit = 50;

  async function loadData() {
    isLoading = true;
    // @ts-ignore
    loadedRows = await loadCollectionDataPage($$props, parseInt(skip) || 0, parseInt(limit) || 50);
    isLoading = false;
    loadedTime = new Date().getTime();
  }

  $: if (cache?.refreshTime > loadedTime) {
    loadData();
  }

  $: if ($tabVisible) lastFocusedEditor = instance;

  export function getTabId() {
    return tabid;
  }

  export function switchToTable() {
    setConfig(cfg => ({
      ...cfg,
      isJsonView: false,
    }));
  }

  onMount(() => {
    loadData();
    if ($tabVisible) lastFocusedEditor = instance;
    invalidateCommands();
  });

  const commonMenu = [{ command: 'dataJson.switchToTable' }];

  $: grider = new ChangeSetGrider(loadedRows, changeSetState, dispatchChangeSet, display);

  $: console.log('GRIDER', grider);
</script>

<div class="flexcol flex1" use:contextMenu={commonMenu}>
  <div class="toolbar">
    <Pager bind:skip bind:limit on:load={() => display.reload()} />
  </div>
  <div class="json">
    {#each _.range(0, grider.rowCount) as rowIndex}
      <CollectionJsonRow {grider} {rowIndex} {commonMenu} />
    {/each}
  </div>
</div>

{#if isLoading}
  <LoadingInfo wrapper message="Loading data" />
{/if}

<style>
  .toolbar {
    background: var(--theme-bg-1);
    display: flex;
    border-bottom: 1px solid var(--theme-border);
    border-top: 2px solid var(--theme-border);
    margin-bottom: 3px;
  }

  .json {
    overflow: auto;
  }
</style>
