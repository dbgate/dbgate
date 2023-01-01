<script>
  import _, { sortBy } from 'lodash';
  import { asyncFilter } from '../utility/common';
  import AppObjectGroup from './AppObjectGroup.svelte';
  import { plusExpandIcon } from '../icons/expandIcons';

  import AppObjectListItem from './AppObjectListItem.svelte';
  import { writable } from 'svelte/store';

  export let list;
  export let module;
  export let subItemsComponent = undefined;
  export let expandOnClick = false;
  export let isExpandable = undefined;
  export let filter = undefined;
  export let expandIconFunc = undefined;
  export let checkedObjectsStore = null;
  export let disableContextMenu = false;
  export let passProps;
  export let getIsExpanded = null;
  export let setIsExpanded = null;
  export let sortGroups = false;
  export let groupContextMenu = null;

  export let groupIconFunc = plusExpandIcon;
  export let groupFunc = undefined;
  export let onDropOnGroup = undefined;
  export let emptyGroupNames = [];

  export let collapsedGroupNames = writable([]);

  $: filtered = !groupFunc
    ? list.filter(data => {
        const matcher = module.createMatcher && module.createMatcher(data);
        if (matcher && !matcher(filter)) return false;
        return true;
      })
    : null;

  $: childrenMatched = !groupFunc
    ? list.filter(data => {
        const matcher = module.createChildMatcher && module.createChildMatcher(data);
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

  function extendGroups(base, emptyList) {
    const res = {
      ...base,
    };
    for (const item of emptyList) {
      if (res[item]) continue;
      res[item] = [];
    }
    return res;
  }

  $: groups = groupFunc ? extendGroups(_.groupBy(listGrouped, 'group'), emptyGroupNames) : null;
</script>

{#if groupFunc}
  {#each sortGroups ? _.sortBy(_.keys(groups)) : _.keys(groups) as group}
    <AppObjectGroup
      {group}
      {module}
      items={groups[group]}
      {expandIconFunc}
      {groupIconFunc}
      {isExpandable}
      {subItemsComponent}
      {checkedObjectsStore}
      {groupFunc}
      {disableContextMenu}
      {filter}
      {passProps}
      {getIsExpanded}
      {setIsExpanded}
      {onDropOnGroup}
      {groupContextMenu}
      {collapsedGroupNames}
    />
  {/each}
{:else}
  {#each list as data}
    <AppObjectListItem
      isHidden={!filtered.includes(data)}
      {module}
      {subItemsComponent}
      {expandOnClick}
      {data}
      {isExpandable}
      on:objectClick
      {expandIconFunc}
      {checkedObjectsStore}
      {disableContextMenu}
      {filter}
      isExpandedBySearch={childrenMatched.includes(data)}
      {passProps}
      {getIsExpanded}
      {setIsExpanded}
    />
  {/each}
{/if}
