<script>
  import Link from '../elements/Link.svelte';

  import { plusExpandIcon } from '../icons/expandIcons';

  import FontIcon from '../icons/FontIcon.svelte';

  import AppObjectListItem from './AppObjectListItem.svelte';

  export let group;
  export let groupFunc;
  export let items;
  export let groupIconFunc = plusExpandIcon;
  export let module;
  export let checkedObjectsStore = null;
  export let disableContextMenu = false;
  export let passProps;

  let isExpanded = true;

  $: filtered = items.filter(x => x.isMatched);
  $: countText = filtered.length < items.length ? `${filtered.length}/${items.length}` : `${items.length}`;

  function handleCheckAll(isChecked) {
    checkedObjectsStore.update(checkList => {
      const res = isChecked
        ? [
            ...checkList,
            ...filtered
              .filter(x => !checkList.find(y => module.extractKey(x.data) == module.extractKey(y)))
              .map(x => x.data),
          ]
        : checkList.filter(x => groupFunc(x) != group);
      return res;
    });
  }
</script>

<div class="group" on:click={() => (isExpanded = !isExpanded)}>
  <span class="expand-icon">
    <FontIcon icon={groupIconFunc(isExpanded)} />
  </span>

  {group}
  {items && `(${countText})`}
</div>

{#if isExpanded}
  {#if checkedObjectsStore}
    <div class="ml-2">
      <Link onClick={() => handleCheckAll(true)}>Check all</Link>
      |
      <Link onClick={() => handleCheckAll(false)}>Uncheck all</Link>
    </div>
  {/if}

  {#each items as item}
    <AppObjectListItem
      isHidden={!item.isMatched}
      {...$$restProps}
      {module}
      data={item.data}
      {checkedObjectsStore}
      on:objectClick
      {disableContextMenu}
      {passProps}
    />
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
