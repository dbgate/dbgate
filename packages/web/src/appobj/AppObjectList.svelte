<script>
  import _ from 'lodash';
  import AppObjectGroup from './AppObjectGroup.svelte';
  import { plusExpandIcon } from '../icons/expandIcons';

  import AppObjectListItem from './AppObjectListItem.svelte';
  import { writable } from 'svelte/store';
  import Link from '../elements/Link.svelte';
  import { focusedConnectionOrDatabase } from '../stores';
  import { tick } from 'svelte';

  export let list;
  export let module;
  export let subItemsComponent = undefined;
  export let expandOnClick = false;
  export let isExpandable = undefined;
  export let filter = undefined;
  export let expandIconFunc = undefined;
  export let checkedObjectsStore = null;
  export let disableContextMenu = false;
  export let passProps = {};
  export let getIsExpanded = null;
  export let setIsExpanded = null;
  export let sortGroups = false;
  export let groupContextMenu = null;

  export let groupIconFunc = plusExpandIcon;
  export let groupFunc = undefined;
  export let onDropOnGroup = undefined;
  export let emptyGroupNames = [];
  export let isExpandedBySearch = false;

  export let collapsedGroupNames = writable([]);
  export let onChangeFilteredList = undefined;

  let expandLimited = false;

  $: matcher = module.createMatcher && module.createMatcher(filter, passProps?.searchSettings);

  $: dataLabeled = _.compact(
    (list || []).map(data => {
      const matchResult = matcher ? matcher(data) : true;

      let isMatched = true;
      let isMainMatched = true;
      let isChildMatched = true;

      if (matchResult == false) {
        isMatched = false;
        isChildMatched = false;
        isMainMatched = false;
      } else if (matchResult == 'child') {
        isMainMatched = false;
      } else if (matchResult == 'main') {
        isChildMatched = false;
      } else if (matchResult == 'none') {
        isMatched = false;
        isChildMatched = false;
        isMainMatched = false;
      } else if (matchResult == 'both') {
        isChildMatched = !module.disableShowChildrenWithParentMatch;
      }

      const group = groupFunc ? groupFunc(data) : undefined;
      return { group, data, isMatched, isChildMatched, isMainMatched };
    })
  );

  $: filtered = dataLabeled.filter(x => x.isMatched).map(x => x.data);
  $: childrenMatched = dataLabeled.filter(x => x.isChildMatched).map(x => x.data);
  $: mainMatched = dataLabeled.filter(x => x.isMainMatched).map(x => x.data);

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

  function setExpandLimited() {
    expandLimited = true;
  }

  $: groups = groupFunc ? extendGroups(_.groupBy(dataLabeled, 'group'), emptyGroupNames) : null;

  $: listLimited = isExpandedBySearch && !expandLimited ? filtered.slice(0, filter.trim().length < 3 ? 1 : 3) : list;
  $: isListLimited = isExpandedBySearch && listLimited.length < filtered.length;
  $: listMissingItems = isListLimited ? filtered.slice(listLimited.length) : [];

  $: if (
    $focusedConnectionOrDatabase &&
    listMissingItems.some(
      x => $focusedConnectionOrDatabase.conid == x?.connection?._id && $focusedConnectionOrDatabase.database == x?.name
    )
  ) {
    tick().then(setExpandLimited);
  }
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
  {#each listLimited as data}
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
      isExpandedBySearch={filter && childrenMatched.includes(data)}
      isMainMatched={filter && mainMatched.includes(data)}
      {passProps}
      {getIsExpanded}
      {setIsExpanded}
    />
  {/each}
  {#if isListLimited}
    <div class="ml-2">
      <Link
        onClick={() => {
          expandLimited = true;
        }}>Show next {filtered.length - listLimited.length}</Link
      >
    </div>
  {/if}
{/if}
