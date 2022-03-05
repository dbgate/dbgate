<script lang="ts">
  import { useDatabaseKeys } from '../utility/metadataLoaders';
  import DbKeysTreeNode from './DbKeysTreeNode.svelte';

  export let conid;
  export let database;

  export let root;
  export let indentLevel = 0;

  $: items = useDatabaseKeys({ conid, database, root });
</script>

{#each $items || [] as item}
  <DbKeysTreeNode {conid} {database} {root} {item} {indentLevel} />
{/each}
