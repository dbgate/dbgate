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
  import { getContext, onMount } from 'svelte';
  import { get_current_component } from 'svelte/internal';
  import invalidateCommands from '../commands/invalidateCommands';
  import registerCommand from '../commands/registerCommand';

  import { loadCollectionDataPage } from '../datagrid/CollectionDataGridCore.svelte';
  import InlineButton from '../elements/InlineButton.svelte';
  import LoadingInfo from '../elements/LoadingInfo.svelte';
  import Pager from '../elements/Pager.svelte';
  import TextField from '../forms/TextField.svelte';
  import FontIcon from '../icons/FontIcon.svelte';

  import JSONTree from '../jsontree/JSONTree.svelte';
  import { getActiveTabId } from '../stores';
  import contextMenu from '../utility/contextMenu';

  export let conid;
  export let database;
  export let cache;
  export let display;
  export let setConfig;

  const instance = get_current_component();
  const tabVisible: any = getContext('tabVisible');
  const tabid = getContext('tabid');

  let isLoading = false;
  let loadedTime = null;

  export let loadedRows = null;
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

  function createMenu() {
    return [{ command: 'dataJson.switchToTable' }];
  }
</script>

<div class="flexcol flex1">
  <div class="toolbar">
    <Pager bind:skip bind:limit on:load={() => display.reload()} />
  </div>
  <div class="json" use:contextMenu={createMenu}>
    <JSONTree value={loadedRows} />
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
