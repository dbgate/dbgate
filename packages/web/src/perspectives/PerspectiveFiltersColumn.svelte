<script lang="ts">
  import DataFilterControl from '../datagrid/DataFilterControl.svelte';

  import ColumnLabel from '../elements/ColumnLabel.svelte';
  import InlineButton from '../buttons/InlineButton.svelte';
  import FontIcon from '../icons/FontIcon.svelte';
  import { getFilterType } from 'dbgate-filterparser';

  export let filter;
  export let onSetFilter;
  export let onRemoveFilter;
  export let filterType;
  export let columnName;
</script>

<div class="m-1">
  <div class="space-between">
    {columnName}
    <InlineButton square narrow on:click={onRemoveFilter}>
      <FontIcon icon="icon close" />
    </InlineButton>
  </div>
  <DataFilterControl {filterType} {filter} setFilter={onSetFilter} />
</div>
