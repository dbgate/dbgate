<script lang="ts">
  import AppObjectCore from '../appobj/AppObjectCore.svelte';
  import LoadingInfo from '../elements/LoadingInfo.svelte';
  import { apiCall } from '../utility/api';

  const SHOW_INCREMENT = 500;

  import DbKeysTreeNode from './DbKeysTreeNode.svelte';

  export let conid;
  export let database;

  export let root;
  export let indentLevel = 0;

  export let reloadToken = 0;
  let reloadToken2 = 0;

  let maxShowCount = SHOW_INCREMENT;

  // $: items = useDatabaseKeys({ conid, database, root, reloadToken });
</script>

{#await apiCall('database-connections/load-keys', { conid, database, root, reloadToken, reloadToken2 })}
  <LoadingInfo message="Loading key list" wrapper />
{:then items}
  {#each (items || []).slice(0, maxShowCount) as item}
    <DbKeysTreeNode
      {conid}
      {database}
      {root}
      {item}
      {indentLevel}
      onRefreshParent={() => {
        reloadToken2 += 1;
      }}
    />
  {/each}

  {#if (items || []).length > maxShowCount}
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
{/await}
