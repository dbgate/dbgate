<script>
  import { plusExpandIcon } from '../icons/expandIcons';

  import FontIcon from '../icons/FontIcon.svelte';

  import AppObjectListItem from './AppObjectListItem.svelte';

  export let group;
  export let items;
  export let module;
  export let checkedObjectsStore = null;

  let isExpanded = true;

  $: filtered = items.filter(x => x.isMatched);
  $: countText = filtered.length < items.length ? `${filtered.length}/${items.length}` : `${items.length}`;
</script>

<div class="group" on:click={() => (isExpanded = !isExpanded)}>
  <span class="expand-icon">
    <FontIcon icon={plusExpandIcon(isExpanded)} />
  </span>

  {group}
  {items && `(${countText})`}
</div>

{#if isExpanded}
  {#each filtered as item (module.extractKey(item.data))}
    <AppObjectListItem {...$$restProps} {module} data={item.data} {checkedObjectsStore} on:objectClick />
  {/each}
{/if}

<style>
  .group {
    user-select: none;
    padding: 5px;
    cursor: pointer;
    white-space: nowrap;
    font-weight: bold;
  }

  .group:hover {
    background-color: var(--theme-bg-hover);
  }
  .expand-icon {
    margin-right: 3px;
  }
</style>
