<script lang="ts">
  import { getFilterType } from 'dbgate-filterparser';

  import DataFilterControl from '../datagrid/DataFilterControl.svelte';

  import ColumnLabel from '../elements/ColumnLabel.svelte';
  import InlineButton from '../buttons/InlineButton.svelte';
  import FontIcon from '../icons/FontIcon.svelte';

  export let uniqueName;
  export let display;
  export let filters;

  export let driver;
  export let conid;
  export let database;
  export let schemaName;
  export let pureName;

  export let useEvalFilters;
  export let isDynamicStructure;
  export let isFormView;

  $: column = isFormView
    ? display.display.formColumns.find(x => x.uniqueName == uniqueName)
    : display.findColumn(uniqueName);

  function computeFilterType(display, column, isFormView, isDynamicStructure, useEvalFilters) {
    if (useEvalFilters) return 'eval';
    if (isDynamicStructure) return 'mongo';

    if (column) {
      return column.filterType || getFilterType(column.dataType);
    }
    return 'string';
  }
</script>

{#if column}
  <div class="m-1">
    <div class="space-between">
      <ColumnLabel {...column} />
      <InlineButton
        square
        narrow
        on:click={() => {
          display.removeFilter(uniqueName);
        }}
      >
        <FontIcon icon="icon close" />
      </InlineButton>
    </div>
    <DataFilterControl
      filterType={computeFilterType(display, uniqueName, isFormView, isDynamicStructure, useEvalFilters)}
      filter={filters[uniqueName]}
      setFilter={value => display.setFilter(uniqueName, value)}
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
