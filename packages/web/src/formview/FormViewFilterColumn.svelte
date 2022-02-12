<script lang="ts">
  import { getFilterType } from 'dbgate-filterparser';

  import DataFilterControl from '../datagrid/DataFilterControl.svelte';

  import ColumnLabel from '../elements/ColumnLabel.svelte';
  import InlineButton from '../buttons/InlineButton.svelte';
  import FontIcon from '../icons/FontIcon.svelte';

  export let column;
  export let formDisplay;
  export let filters;

  export let driver;
  export let conid;
  export let database;
  export let schemaName;
  export let pureName;
</script>

{#if column}
  <div class="m-1">
    <div class="space-between">
      <ColumnLabel {...column} />
      <InlineButton
        square
        narrow
        on:click={() => {
          formDisplay.removeFilter(column.uniqueName);
        }}
      >
        <FontIcon icon="icon close" />
      </InlineButton>
    </div>
    <DataFilterControl
      filterType={getFilterType(column.dataType)}
      filter={filters[column.uniqueName]}
      setFilter={value => formDisplay.setFilter(column.uniqueName, value)}
      {driver}
      {conid}
      {database}
      {schemaName}
      {pureName}
      columnName={column.uniquePath.length == 1 ? column.uniquePath[0] : null}
      foreignKey={column.foreignKey}
    />
  </div>
{/if}
