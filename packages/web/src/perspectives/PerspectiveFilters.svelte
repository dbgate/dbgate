<script lang="ts">
  import { PerspectiveTreeNode } from 'dbgate-datalib';
  import type { ChangePerspectiveConfigFunc, PerspectiveConfig } from 'dbgate-datalib';
  import { keys } from 'localforage';

  import _, { map } from 'lodash';
  import { each } from 'svelte/internal';

  import ManagerInnerContainer from '../elements/ManagerInnerContainer.svelte';
  import FontIcon from '../icons/FontIcon.svelte';
  import PerspectiveFiltersColumn from './PerspectiveFiltersColumn.svelte';

  export let managerSize;
  export let config: PerspectiveConfig;
  export let setConfig: ChangePerspectiveConfigFunc;
  export let root: PerspectiveTreeNode;

  export let conid;
  export let database;
  export let driver;

  $: filterCount = _.sum(config.nodes.map(x => _.keys(x.filters).length));
</script>

<ManagerInnerContainer width={managerSize} isFlex={filterCount == 0}>
  {#if filterCount == 0}
    <div class="msg">
      <div class="mb-3 bold">No Filters defined</div>
      <div><FontIcon icon="img info" /> Use context menu, command "Add to filter" in table or in tree</div>
    </div>
  {:else}
    {#each config.nodes as nodeConfig}
      {#each _.keys(nodeConfig.filters) as filterKey}
        {@const tableNode = root?.findNodeByDesignerId(nodeConfig.designerId)}
        {@const filterInfo = tableNode?.childNodes?.find(x => x.columnName == filterKey)?.filterInfo}
        {#if filterInfo}
          <PerspectiveFiltersColumn
            {filterInfo}
            {conid}
            {database}
            {driver}
            {tableNode}
            {config}
            {setConfig}
            filter={nodeConfig.filters[filterKey]}
            onSetFilter={value =>
              setConfig(cfg => ({
                ...cfg,
                nodes: cfg.nodes.map(n =>
                  n.designerId == tableNode.designerId
                    ? {
                        ...n,
                        filters: {
                          ...n.filters,
                          [filterKey]: value,
                        },
                      }
                    : n
                ),
              }))}
            onRemoveFilter={value =>
              setConfig(cfg => ({
                ...cfg,
                nodes: cfg.nodes.map(n =>
                  n.designerId == tableNode.designerId
                    ? {
                        ...n,
                        filters: _.omit(n.filters, [filterKey]),
                      }
                    : n
                ),
              }))}
          />
        {/if}
      {/each}
    {/each}
  {/if}
</ManagerInnerContainer>

<style>
  .msg {
    background: var(--theme-bg-1);
    flex: 1;
    padding: 10px;
  }
</style>
