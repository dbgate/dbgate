<script lang="ts">
  import { getFilterType } from 'dbgate-filterparser';

  import DataFilterControl from '../datagrid/DataFilterControl.svelte';

  import ColumnLabel from '../elements/ColumnLabel.svelte';
  import InlineButton from '../elements/InlineButton.svelte';
  import FontIcon from '../icons/FontIcon.svelte';

  export let column;
  export let formDisplay;
  export let filters;
</script>

{#if column}
  <div class="m-1">
    <div class="space-between">
      <ColumnLabel {...column} />
      <InlineButton
        square
        on:click={() => {
          formDisplay.removeFilter(column.uniqueName);
        }}
      >
        <FontIcon icon="icon delete" />
      </InlineButton>
    </div>
    <DataFilterControl
      filterType={getFilterType(column.dataType)}
      filter={filters[column.uniqueName]}
      setFilter={value => formDisplay.setFilter(column.uniqueName, value)}
    />
  </div>
{/if}
