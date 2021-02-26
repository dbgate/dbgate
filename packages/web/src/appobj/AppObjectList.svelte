<script lang="ts">
  import AppObjectListItem from './AppObjectListItem.svelte';

  export let list;
  export let component;
  export let subItemsComponent = undefined;
  export let expandOnClick = false;

  export let groupFunc = undefined;
</script>

{#each list as data}
  <AppObjectListItem {component} {subItemsComponent} {expandOnClick} {data} on:objectClick />
{/each}
