<script lang="ts">
  import _ from 'lodash';

  import AppObjectCore from '../appobj/AppObjectCore.svelte';
  import LoadingInfo from '../elements/LoadingInfo.svelte';
  import { apiCall } from '../utility/api';

  const SHOW_INCREMENT = 100;

  import DbKeysTreeNode from './DbKeysTreeNode.svelte';

  export let conid;
  export let database;

  export let root;
  export let indentLevel = 0;

  export let reloadToken = 0;
  export let connection;
  export let filter;

  let reloadToken2 = 0;
  let maxShowCount = SHOW_INCREMENT;
  let loading = false;
  let loadingWhole = false;
  let items = [];

  async function loadData() {
    loading = true;
    const result = await apiCall('database-connections/load-keys', {
      conid,
      database,
      root,
      filter,
      limit: maxShowCount + 1,
    });
    items = result;
    loading = false;
    loadingWhole = false;
  }

  $: {
    conid;
    database;
    root;
    filter;
    reloadToken;
    reloadToken2;
    maxShowCount;
    loadData();
  }

  $: {
    reloadToken;
    loadingWhole = true;
  }
</script>

{#if loadingWhole}
  <LoadingInfo message="Loading key list" wrapper />
{:else}
  {#each items.slice(0, maxShowCount) as item}
    <DbKeysTreeNode
      {conid}
      {database}
      {root}
      {connection}
      {item}
      {filter}
      {indentLevel}
      onRefreshParent={() => {
        reloadToken2 += 1;
      }}
    />
  {/each}

  {#if loading}
    <AppObjectCore {indentLevel} title="Loading keys..." icon="icon loading" expandIcon="icon invisible-box" />
  {:else if items.length > maxShowCount}
    <AppObjectCore
      {indentLevel}
      title="Show more..."
      icon="icon dots-horizontal"
      expandIcon="icon invisible-box"
      on:click={() => {
        maxShowCount += SHOW_INCREMENT;
      }}
    />
  {/if}
{/if}
