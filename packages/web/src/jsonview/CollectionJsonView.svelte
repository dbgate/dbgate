<script lang="ts">
  import { onMount } from 'svelte';

  import { loadCollectionDataPage } from '../datagrid/CollectionDataGridCore.svelte';
  import InlineButton from '../elements/InlineButton.svelte';
  import LoadingInfo from '../elements/LoadingInfo.svelte';
  import Pager from '../elements/Pager.svelte';
  import TextField from '../forms/TextField.svelte';
  import FontIcon from '../icons/FontIcon.svelte';

  import JSONTree from '../jsontree/JSONTree.svelte';

  export let conid;
  export let database;
  export let cache;
  export let display;

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

  onMount(() => {
    loadData();
  });
</script>

<div class="flexcol flex1">
  <div class="toolbar">
    <Pager bind:skip bind:limit on:load={() => display.reload()} />
  </div>
  <div class="json">
    <JSONTree value={loadedRows} />
  </div>
</div>

{#if isLoading}
  <LoadingInfo wrapper message="Loading data" />
{/if}

<style>
  .toolbar {
    background: var(--theme-bg-3);
    display: flex;
    border-bottom: 1px solid var(--theme-border);
    margin-bottom: 3px;
  }

  .json {
    overflow: auto;
  }
</style>
