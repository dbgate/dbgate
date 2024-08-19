<script lang="ts">
  import DataFilterControl from '../datagrid/DataFilterControl.svelte';

  import InlineButton from '../buttons/InlineButton.svelte';
  import FontIcon from '../icons/FontIcon.svelte';
  import { PerspectiveTreeNode } from 'dbgate-datalib';
  import type { ChangePerspectiveConfigFunc, PerspectiveConfig, PerspectiveFilterColumnInfo } from 'dbgate-datalib';

  export let filterInfo: PerspectiveFilterColumnInfo;

  export let filter;
  export let onSetFilter;
  export let onRemoveFilter;

  export let conid;
  export let database;
  export let driver;

  export let config: PerspectiveConfig;
  export let setConfig: ChangePerspectiveConfigFunc;

  export let tableNode: PerspectiveTreeNode;

  // $: console.log('node', node);
  // $: console.log('node?.parentNode?.supportsParentFilter', node?.parentNode?.supportsParentFilter);
  // $: console.log('node?.parentNode', node?.parentNode);

  $: customCommandIcon = tableNode?.supportsParentFilter
    ? tableNode?.isParentFilter
      ? 'icon parent-filter'
      : 'icon parent-filter-outline'
    : null;

  function changeParentFilter() {
    setConfig(
      cfg => ({
        ...cfg,
        nodes: cfg.nodes.map(n =>
          n.designerId == tableNode?.designerId
            ? {
                ...n,
                isParentFilter: !n.isParentFilter,
              }
            : n
        ),
      }),
      true
    );
  }
</script>

<div class="m-1">
  <div class="space-between">
    {filterInfo.columnName} ({filterInfo.pureName})
    <InlineButton square narrow on:click={onRemoveFilter}>
      <FontIcon icon="icon close" />
    </InlineButton>
  </div>
  <DataFilterControl
    filterBehaviour={filterInfo.filterBehaviour}
    {filter}
    setFilter={onSetFilter}
    {conid}
    {database}
    {driver}
    columnName={filterInfo.columnName}
    pureName={filterInfo.pureName}
    foreignKey={filterInfo.foreignKey}
    {customCommandIcon}
    onCustomCommand={customCommandIcon ? changeParentFilter : null}
    customCommandTooltip="Filter parent rows"
  />
</div>
