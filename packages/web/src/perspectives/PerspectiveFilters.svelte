<script lang="ts">
  import { ChangePerspectiveConfigFunc, PerspectiveConfig, PerspectiveTreeNode } from 'dbgate-datalib';

  import _ from 'lodash';

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

  $: allFilterNames = _.keys(config.filters || {});
</script>

<ManagerInnerContainer width={managerSize} isFlex={allFilterNames.length == 0}>
  {#if allFilterNames.length == 0}
    <div class="msg">
      <div class="mb-3 bold">No Filters defined</div>
      <div><FontIcon icon="img info" /> Use context menu, command "Add to filter" in table or in tree</div>
    </div>
  {:else}
    {#each allFilterNames as uniqueName}
      {@const node = root?.findNodeByUniqueName(uniqueName)}
      {@const filterInfo = node?.filterInfo}
      {#if filterInfo}
        <PerspectiveFiltersColumn
          {filterInfo}
          {uniqueName}
          {conid}
          {database}
          {driver}
          {node}
          {config}
          {setConfig}
          filter={config.filters[uniqueName]}
          onSetFilter={value =>
            setConfig(cfg => ({
              ...cfg,
              filters: {
                ...cfg.filters,
                [uniqueName]: value,
              },
            }))}
          onRemoveFilter={value =>
            setConfig(cfg => ({
              ...cfg,
              filters: _.omit(cfg.filters, [uniqueName]),
            }))}
        />
      {/if}
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
