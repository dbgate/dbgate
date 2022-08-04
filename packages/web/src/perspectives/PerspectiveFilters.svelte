<script lang="ts">
  import { ChangePerspectiveConfigFunc, PerspectiveConfig } from 'dbgate-datalib';

  import _ from 'lodash';

  import ManagerInnerContainer from '../elements/ManagerInnerContainer.svelte';
  import PerspectiveFiltersColumn from './PerspectiveFiltersColumn.svelte';

  export let managerSize;
  export let config: PerspectiveConfig;
  export let setConfig: ChangePerspectiveConfigFunc;

  $: allFilterNames = _.keys(config.filterInfos || {});
</script>

<ManagerInnerContainer width={managerSize}>
  {#each allFilterNames as uniqueName}
    <PerspectiveFiltersColumn
      columnName={config.filterInfos[uniqueName].columnName}
      {uniqueName}
      filter={config.filters[uniqueName]}
      filterType={config.filterInfos[uniqueName].filterType}
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
          filterInfos: _.omit(cfg.filterInfos, [uniqueName]),
        }))}
    />
  {/each}
</ManagerInnerContainer>
