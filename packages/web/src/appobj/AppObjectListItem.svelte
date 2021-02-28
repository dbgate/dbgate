<script lang="ts">
  export let module;
  export let data;
  export let subItemsComponent;
  export let expandOnClick;

  let isExpanded = false;

  function handleExpand() {
    if (subItemsComponent && expandOnClick) {
      isExpanded = !isExpanded;
    }
  }
</script>

<svelte:component this={module.default} {data} on:click={handleExpand} />

{#if isExpanded && subItemsComponent}
  <svelte:component this={subItemsComponent} {data} />
{/if}
