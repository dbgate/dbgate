<script lang="ts">
  export let component;
  export let data;

  let isExpanded = false;
</script>

<svelte:component this={component} {data} />
