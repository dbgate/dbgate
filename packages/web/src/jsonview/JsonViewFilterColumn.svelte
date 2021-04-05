<script lang="ts">
  import DataFilterControl from '../datagrid/DataFilterControl.svelte';

  import ColumnLabel from '../elements/ColumnLabel.svelte';
  import InlineButton from '../elements/InlineButton.svelte';
  import FontIcon from '../icons/FontIcon.svelte';

  export let uniqueName;
  export let display;
  export let filters;
</script>

<div class="m-1">
  <div class="space-between">
    <ColumnLabel columnName={uniqueName} />
    <InlineButton
      square
      on:click={() => {
        display.removeFilter(uniqueName);
      }}
    >
      <FontIcon icon="icon delete" />
    </InlineButton>
  </div>
  <DataFilterControl
    filterType="mongo"
    filter={filters[uniqueName]}
    setFilter={value => display.setFilter(uniqueName, value)}
  />
</div>
