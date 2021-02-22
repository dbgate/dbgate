<script lang="ts">
  export let config;
  export let gridCoreComponent;
  export let loadNextData = undefined;
  export let grider = undefined;

  $: firstVisibleRowScrollIndex = 0;
  $: visibleRowCountUpperBound = 25;

  if (loadNextData && firstVisibleRowScrollIndex + visibleRowCountUpperBound >= grider.rowCount) {
    loadNextData();
  }
</script>

<svelte:component this={gridCoreComponent} {...$$props} />
