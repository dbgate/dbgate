<script>
  import _ from 'lodash';
  import { asyncFilter } from '../utility/common';
  import AppObjectGroup from './AppObjectGroup.svelte';

  import AppObjectListItem from './AppObjectListItem.svelte';

  export let list;
  export let module;
  export let subItemsComponent = undefined;
  export let expandOnClick = false;
  export let isExpandable = undefined;
  export let filter = undefined;
  export let expandIconFunc = undefined;
  export let checkedObjectsStore = null;
  export let disableContextMenu = false;

  export let groupFunc = undefined;

  $: filtered = !groupFunc
    ? list.filter(data => {
        const matcher = module.createMatcher && module.createMatcher(data);
        if (matcher && !matcher(filter)) return false;
        return true;
      })
    : null;

  // let filtered = [];

  // $: {
  //   if (!groupFunc) {
  //     asyncFilter(list, async data => {
  //       const matcher = module.createMatcher && module.createMatcher(data);
  //       if (matcher && !(await matcher(filter))) return false;
  //       return true;
  //     }).then(res => {
  //       filtered = res;
  //     });
  //   }
  // }

  $: listGrouped = groupFunc
    ? _.compact(
        (list || []).map(data => {
          const matcher = module.createMatcher && module.createMatcher(data);
          const isMatched = matcher && !matcher(filter) ? false : true;
          const group = groupFunc(data);
          return { group, data, isMatched };
        })
      )
    : null;

  $: groups = groupFunc ? _.groupBy(listGrouped, 'group') : null;
</script>

{#if groupFunc}
  {#each _.keys(groups) as group}
    <AppObjectGroup
      {group}
      {module}
      items={groups[group]}
      {expandIconFunc}
      {isExpandable}
      {subItemsComponent}
      {checkedObjectsStore}
      {groupFunc}
      {disableContextMenu}
    />
  {/each}
{:else}
  {#each filtered as data}
    <AppObjectListItem
      {module}
      {subItemsComponent}
      {expandOnClick}
      {data}
      {isExpandable}
      on:objectClick
      {expandIconFunc}
      {checkedObjectsStore}
      {disableContextMenu}
    />
  {/each}
{/if}
