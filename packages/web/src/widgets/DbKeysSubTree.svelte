<script lang="ts">
  import AppObjectCore from '../appobj/AppObjectCore.svelte';

  const SHOW_INCREMENT = 500;

  import { useDatabaseKeys } from '../utility/metadataLoaders';
  import DbKeysTreeNode from './DbKeysTreeNode.svelte';

  export let conid;
  export let database;

  export let root;
  export let indentLevel = 0;

  let maxShowCount = SHOW_INCREMENT;

  $: items = useDatabaseKeys({ conid, database, root });
</script>

{#each ($items || []).slice(0, maxShowCount) as item}
  <DbKeysTreeNode {conid} {database} {root} {item} {indentLevel} />
{/each}

{#if ($items || []).length > maxShowCount}
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
