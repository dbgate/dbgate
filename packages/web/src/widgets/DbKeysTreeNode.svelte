<script lang="ts">
  import DbKeysSubTree from './DbKeysSubTree.svelte';

  export let conid;
  export let database;

  export let root;

  export let item;

  let isExpanded;
</script>

<div on:click={() => (isExpanded = !isExpanded)}>
  {item.text}
</div>

{#if isExpanded}
  <DbKeysSubTree {conid} {database} root={item.root} />
{/if}
