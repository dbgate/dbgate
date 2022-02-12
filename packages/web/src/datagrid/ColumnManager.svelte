<script lang="ts">
  import _, { indexOf, range } from 'lodash';
  import { GridDisplay } from 'dbgate-datalib';
  import { filterName } from 'dbgate-tools';
  import CloseSearchButton from '../buttons/CloseSearchButton.svelte';

  import InlineButton from '../buttons/InlineButton.svelte';
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
  let dragStartColumnIndex = null;
  let shiftOriginColumnIndex = null;

  $: items = display?.getColumns(filter)?.filter(column => filterName(filter, column.columnName)) || [];

  function selectColumnIndexCore(index, e) {
    const uniqueName = items[index].uniqueName;
    if (e.shiftKey) {
      const curIndex = _.findIndex(items, x => x.uniqueName == currentColumnUniqueName);
      if (curIndex >= 0 && shiftOriginColumnIndex == null) shiftOriginColumnIndex = curIndex;

      selectedColumns = _.range(
        Math.min(shiftOriginColumnIndex, index),
        Math.max(shiftOriginColumnIndex, index) + 1
      ).map(i => items[i].uniqueName);
    } else {
      selectedColumns = [uniqueName];
      shiftOriginColumnIndex = null;
    }

    currentColumnUniqueName = uniqueName;
    if (!isJsonView) {
      display.focusColumns(selectedColumns);
    }
  }

  function selectColumnIndex(index, e) {
    if (index >= 0 && index < items.length) {
      selectColumnIndexCore(index, e);
      return;
    }
    if (items.length == 0) {
      return;
    }
    if (index < 0) {
      selectColumnIndexCore(0, e);
      return;
    } else if (index >= items.length) {
      selectColumnIndexCore(items.length - 1, e);
      return;
    }
  }

  function moveIndex(indexFunc, e) {
    const index = _.findIndex(items, x => x.uniqueName == currentColumnUniqueName);
    if (index >= 0) {
      selectColumnIndex(indexFunc(index), e);
    }
  }

  function handleKeyDown(e) {
    if (e.keyCode == keycodes.upArrow) moveIndex(i => i - 1, e);
    else if (e.keyCode == keycodes.downArrow) moveIndex(i => i + 1, e);
    else if (e.keyCode == keycodes.home) moveIndex(() => 0, e);
    else if (e.keyCode == keycodes.end) moveIndex(() => items.length - 1, e);
    else if (e.keyCode == keycodes.pageUp) moveIndex(i => i - 10, e);
    else if (e.keyCode == keycodes.pageDown) moveIndex(i => i + 10, e);
    else if (e.keyCode == keycodes.space) {
      let checked = null;
      for (const name of selectedColumns) {
        const column = items.find(x => x.uniqueName == name);
        if (column) {
          if (checked == null) checked = !column.isChecked;
          display.setColumnVisibility(column.uniquePath, checked);
        }
      }
    }
  }
  function copyToClipboard() {
    copyTextToClipboard(selectedColumns.join('\r\n'));
  }

  export function setSelectedColumns(value) {
    selectedColumns = value;
    if (value.length > 0) currentColumnUniqueName = value[0];
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
      on:mousemove={e => {
        if (e.buttons == 1 && dragStartColumnIndex != null && dragStartColumnIndex >= 0) {
          const index = _.findIndex(items, x => x.uniqueName == column.uniqueName);
          if (index >= 0) {
            selectedColumns = _.range(
              Math.min(dragStartColumnIndex, index),
              Math.max(dragStartColumnIndex, index) + 1
            ).map(i => items[i].uniqueName);
            currentColumnUniqueName = column.uniqueName;
            if (!isJsonView) {
              display.focusColumns([currentColumnUniqueName, ...selectedColumns]);
            }
          }
        }
      }}
      on:mousedown={e => {
        dragStartColumnIndex = _.findIndex(items, x => x.uniqueName == column.uniqueName);
        selectedColumns = [column.uniqueName];
        if (domFocusField) domFocusField.focus();
        currentColumnUniqueName = column.uniqueName;
        if (!isJsonView) {
          display.focusColumns(selectedColumns);
        }
      }}
      on:mouseup={e => {
        if (domFocusField) domFocusField.focus();
      }}
      on:setvisibility={e => {
        for (const name of selectedColumns) {
          const column = items.find(x => x.uniqueName == name);
          if (column) {
            display.setColumnVisibility(column.uniquePath, e.detail);
          }
        }
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
