<script lang="ts">
  import { GridDisplay } from 'dbgate-datalib';
  import { filterName } from 'dbgate-tools';

  import InlineButton from '../elements/InlineButton.svelte';
  import ManagerInnerContainer from '../elements/ManagerInnerContainer.svelte';

  import SearchBoxWrapper from '../elements/SearchBoxWrapper.svelte';
  import SearchInput from '../elements/SearchInput.svelte';
  import InputTextModal from '../modals/InputTextModal.svelte';
  import { showModal } from '../modals/modalTools';
  import ColumnManagerRow from './ColumnManagerRow.svelte';

  export let managerSize;
  export let display: GridDisplay;
  export let isJsonView = false;
  export let isDynamicStructure = false;

  let filter;
</script>

<SearchBoxWrapper>
  <SearchInput placeholder="Search columns" bind:value={filter} />
  {#if isDynamicStructure && !isJsonView}
    <InlineButton
      on:click={() => {
        showModal(InputTextModal, {
          value: '',
          label: 'Column name',
          header: 'Add new column',
          onConfirm: name => {
            display.addDynamicColumn(name);
          },
        });
      }}>Add</InlineButton
    >
  {/if}
  <InlineButton on:click={() => display.hideAllColumns()}>Hide</InlineButton>
  <InlineButton on:click={() => display.showAllColumns()}>Show</InlineButton>
</SearchBoxWrapper>
<ManagerInnerContainer width={managerSize}>
  {#each display
    ?.getColumns(filter)
    ?.filter(column => filterName(filter, column.columnName)) || [] as column (column.uniqueName)}
    <ColumnManagerRow {display} {column} {isJsonView} />
  {/each}
</ManagerInnerContainer>
