<script lang="ts">
  import DataFilterControl from '../datagrid/DataFilterControl.svelte';

  import ColumnLabel from '../elements/ColumnLabel.svelte';
  import InlineButton from '../buttons/InlineButton.svelte';
  import FontIcon from '../icons/FontIcon.svelte';
  import { getFilterType } from 'dbgate-filterparser';
  import { PerspectiveFilterColumnInfo } from 'dbgate-datalib';

  export let filterInfo: PerspectiveFilterColumnInfo;

  export let filter;
  export let onSetFilter;
  export let onRemoveFilter;
</script>

<div class="m-1">
  <div class="space-between">
    {filterInfo.columnName} ({filterInfo.tableName})
    <InlineButton square narrow on:click={onRemoveFilter}>
      <FontIcon icon="icon close" />
    </InlineButton>
  </div>
  <DataFilterControl filterType={filterInfo.filterType} {filter} setFilter={onSetFilter} />
</div>
