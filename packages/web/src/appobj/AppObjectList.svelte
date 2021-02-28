<script lang="ts">
  import AppObjectListItem from './AppObjectListItem.svelte';

  export let list;
  export let module;
  export let subItemsComponent = undefined;
  export let expandOnClick = false;
  export let filter;

  export let groupFunc = undefined;

  $: filtered = list.filter(data => {
    const matcher = module.createMatcher && module.createMatcher(data);
    if (matcher && !matcher(filter)) return false;
    return true;
  });
</script>

{#each filtered as data}
  <AppObjectListItem {module} {subItemsComponent} {expandOnClick} {data} on:objectClick />
{/each}
