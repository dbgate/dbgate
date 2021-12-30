<script lang="ts">
  import _ from 'lodash';
  import { GridDisplay } from 'dbgate-datalib';
  import { filterName } from 'dbgate-tools';
  import CloseSearchButton from '../elements/CloseSearchButton.svelte';

  import InlineButton from '../elements/InlineButton.svelte';
  import ManagerInnerContainer from '../elements/ManagerInnerContainer.svelte';

  import SearchBoxWrapper from '../elements/SearchBoxWrapper.svelte';
  import SearchInput from '../elements/SearchInput.svelte';
  import InputTextModal from '../modals/InputTextModal.svelte';
  import { showModal } from '../modals/modalTools';
  import keycodes from '../utility/keycodes';
  import ColumnManagerRow from './ColumnManagerRow.svelte';
  import { copyTextToClipboard } from '../utility/clipboard';

  export let managerSize;
  export let display: GridDisplay;
  export let isJsonView = false;
  export let isDynamicStructure = false;

  let filter;
  let domFocusField;

  let selectedColumns = [];
  let currentColumnUniqueName = null;

  $: items = display?.getColumns(filter)?.filter(column => filterName(filter, column.columnName)) || [];

  function selectColumn(uniqueName) {
    currentColumnUniqueName = uniqueName;
    selectedColumns = [uniqueName];
    if (!isJsonView) {
      display.focusColumn(uniqueName);
    }
  }

  function selectColumnIndex(index) {
    if (index >= 0 && index < items.length) {
      selectColumn(items[index].uniqueName);
      return;
    }
    if (items.length == 0) {
      return;
    }
    if (index < 0) {
      selectColumn(items[0].uniqueName);
      return;
    } else if (index >= items.length) {
      selectColumn(items[items.length - 1].uniqueName);
      return;
    }
  }

  function moveIndex(indexFunc) {
    const index = _.findIndex(items, x => x.uniqueName == currentColumnUniqueName);
    if (index >= 0) {
      selectColumnIndex(indexFunc(index));
    }
  }

  function handleKeyDown(e) {
    if (e.keyCode == keycodes.upArrow) moveIndex(i => i - 1);
    else if (e.keyCode == keycodes.downArrow) moveIndex(i => i + 1);
    else if (e.keyCode == keycodes.home) moveIndex(() => 0);
    else if (e.keyCode == keycodes.end) moveIndex(() => items.length - 1);
    else if (e.keyCode == keycodes.pageUp) moveIndex(i => i - 10);
    else if (e.keyCode == keycodes.pageDown) moveIndex(i => i + 10);
  }
  function copyToClipboard() {
    copyTextToClipboard(selectedColumns.join('\r\r'));
  }
</script>

<SearchBoxWrapper>
  <SearchInput placeholder="Search columns" bind:value={filter} />
  <CloseSearchButton bind:filter />
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
  <input
    type="text"
    class="focus-field"
    bind:this={domFocusField}
    on:keydown={handleKeyDown}
    on:focus={() => {
      // activator.activate();
      // invalidateCommands();
    }}
    on:copy={copyToClipboard}
  />

  {#each items as column (column.uniqueName)}
    <ColumnManagerRow
      {display}
      {column}
      {isJsonView}
      isSelected={selectedColumns.includes(column.uniqueName) || currentColumnUniqueName == column.uniqueName}
      on:click={() => {
        if (domFocusField) domFocusField.focus();
        selectedColumns = [column.uniqueName];
        currentColumnUniqueName = column.uniqueName;
      }}
    />
  {/each}
</ManagerInnerContainer>

<style>
  .focus-field {
    position: absolute;
    left: -1000px;
    top: -1000px;
  }
</style>
