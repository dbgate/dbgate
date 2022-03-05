<script lang="ts">
  import { useDatabaseKeys } from '../utility/metadataLoaders';
  import DbKeysTreeNode from './DbKeysTreeNode.svelte';

  export let conid;
  export let database;

  export let root;

  $: items = useDatabaseKeys({ conid, database, root });
</script>

{#each $items || [] as item}
  <DbKeysTreeNode {conid} {database} {root} {item} />
{/each}
