<script lang="ts">
  import DataFilterControl from '../datagrid/DataFilterControl.svelte';

  import ColumnLabel from '../elements/ColumnLabel.svelte';
  import InlineButton from '../buttons/InlineButton.svelte';
  import FontIcon from '../icons/FontIcon.svelte';
  import { getFilterType } from 'dbgate-filterparser';

  export let uniqueName;
  export let display;
  export let filters;
  export let isDynamicStructure;

  function computeFilterType(isDynamicStructure, display, uniqueName) {
    if (isDynamicStructure) return 'mongo';
    const col = display.findColumn(uniqueName);
    if (col) {
      return col.filterType || getFilterType(col.dataType);
    }
    return 'string';
  }
</script>

<div class="m-1">
  <div class="space-between">
    <ColumnLabel columnName={uniqueName} />
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
    filterType={computeFilterType(isDynamicStructure, display, uniqueName)}
    filter={filters[uniqueName]}
    setFilter={value => display.setFilter(uniqueName, value)}
  />
</div>
