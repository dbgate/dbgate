<script lang="ts">
  import { createGridCache, createGridConfig, FreeTableGridDisplay } from 'dbgate-datalib';
  import DataGridCore from '../datagrid/DataGridCore.svelte';
  import RowsArrayGrider from '../datagrid/RowsArrayGrider';
  import TabControl from '../elements/TabControl.svelte';
  import { TableInfo } from 'dbgate-types';
  import { writable } from 'svelte/store';
  import DataGrid from '../datagrid/DataGrid.svelte';
  import ErrorInfo from '../elements/ErrorInfo.svelte';

  let selectedTab = 0;

  export let result;

  const config = writable(createGridConfig());
  const cache = writable(createGridCache());

  $: grider = result?.rows && result?.columns ? new RowsArrayGrider(result.rows) : null;
  $: display =
    result?.rows && result?.columns
      ? new FreeTableGridDisplay(
          {
            structure: {
              columns: result.columns,
            } as TableInfo,
            rows: result.rows,
          },
          $config,
          config.update,
          $cache,
          cache.update
        )
      : null;
</script>

<TabControl
  bind:value={selectedTab}
  tabs={[grider && display && { label: 'Data', slot: 1 }, { label: 'Status', slot: 2 }]}
>
  <svelte:fragment slot="1">
    {#if grider && display}
      <DataGrid {grider} {display} gridCoreComponent={DataGridCore} />
    {/if}
  </svelte:fragment>
  <svelte:fragment slot="2">
    {#if result?.errorMessage}
      <ErrorInfo message={result?.errorMessage} alignTop />
    {:else if result?.rows}
      <ErrorInfo message={`Returned ${result.rows.length} rows`} icon="img info" alignTop />
    {/if}
  </svelte:fragment>
</TabControl>
