<script lang="ts" context="module">
  const getCurrentEditor = () => getActiveComponent('CollectionJsonView');
</script>

<script lang="ts">
  import _ from 'lodash';

  import { onMount } from 'svelte';
  import registerCommand from '../commands/registerCommand';
  import ChangeSetGrider from '../datagrid/ChangeSetGrider';
  import createActivator, { getActiveComponent } from '../utility/createActivator';

  import { loadCollectionDataPage } from '../datagrid/CollectionDataGridCore.svelte';
  import LoadingInfo from '../elements/LoadingInfo.svelte';
  import Pager from '../elements/Pager.svelte';

  import contextMenu, { getContextMenu, registerMenu } from '../utility/contextMenu';
  import CollectionJsonRow from './CollectionJsonRow.svelte';

  export let conid;
  export let database;
  export let cache;
  export let display;
  export let setConfig;

  export let changeSetState;
  export let dispatchChangeSet;

  export const activator = createActivator('CollectionJsonView', true);

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

  onMount(() => {
    loadData();
  });

  const menu = getContextMenu();

  $: grider = new ChangeSetGrider(loadedRows, changeSetState, dispatchChangeSet, display);

  // $: console.log('GRIDER', grider);
</script>

<div class="flexcol flex1" use:contextMenu={[{ placeTag: 'switch' }, menu]}>
  <div class="toolbar">
    <Pager bind:skip bind:limit on:load={() => display.reload()} />
  </div>
  <div class="json">
    {#each _.range(0, grider.rowCount) as rowIndex}
      <CollectionJsonRow {grider} {rowIndex} />
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
