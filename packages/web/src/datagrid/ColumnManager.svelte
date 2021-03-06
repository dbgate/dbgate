<script lang="ts">
  import { filterName, GridDisplay } from 'dbgate-datalib';

  import InlineButton from '../elements/InlineButton.svelte';
  import ManagerInnerContainer from '../elements/ManagerInnerContainer.svelte';

  import SearchBoxWrapper from '../elements/SearchBoxWrapper.svelte';
  import SearchInput from '../elements/SearchInput.svelte';
  import ColumnManagerRow from './ColumnManagerRow.svelte';

  export let managerSize;
  export let display: GridDisplay;

  let columnFilter;
</script>

<SearchBoxWrapper>
  <SearchInput placeholder="Search columns" bind:value={columnFilter} />
  <InlineButton on:click={() => display.hideAllColumns()}>Hide</InlineButton>
  <InlineButton on:click={() => display.showAllColumns()}>Show</InlineButton>
</SearchBoxWrapper>
<ManagerInnerContainer width={managerSize}>
  {#each display
    .getColumns(columnFilter)
    .filter(column => filterName(columnFilter, column.columnName)) as column (column.uniqueName)}
    <ColumnManagerRow {display} {column} />
  {/each}
</ManagerInnerContainer>
