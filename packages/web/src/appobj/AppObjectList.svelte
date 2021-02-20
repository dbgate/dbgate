<script lang="ts">
  import AppObjectListItem from './AppObjectListItem.svelte';

  export let groupFunc;
  export let list;
  export let component;
</script>

{#each list as data}
  <AppObjectListItem {component} {data} />
{/each}
