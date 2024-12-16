<script lang="ts">
  import _, { add, indexOf, range } from 'lodash';
  import { ChangeSet, DisplayColumn, GridDisplay } from 'dbgate-datalib';
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
  import SelectField from '../forms/SelectField.svelte';
  import ColumnEditorModal from '../tableeditor/ColumnEditorModal.svelte';
  import { tick } from 'svelte';

  export let managerSize;
  export let display: GridDisplay;
  export let isJsonView = false;
  export let isDynamicStructure = false;
  export let conid;
  export let database;
  export let allowChangeChangeSetStructure = false;
  export let changeSetState: { value: ChangeSet } = null;
  export let dispatchChangeSet = null;

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

  $: tableInfo = display?.editableStructure;
  $: setTableInfo = updFunc => {
    const structure = updFunc(display?.editableStructure);
    let added = [];
    if (structure['__addDataCommands']) {
      added = structure['__addDataCommands'];
      delete structure['__addDataCommands'];
    }
    dispatchChangeSet({
      type: 'set',
      value: {
        ...changeSetState?.value,
        dataUpdateCommands: [...(changeSetState?.value?.dataUpdateCommands || []), ...added],
        structure,
      },
    });
    tick().then(() => display.reload());
  };

  $: addDataCommand = allowChangeChangeSetStructure;

  function handleAddColumn() {
    showModal(ColumnEditorModal, {
      setTableInfo,
      tableInfo,
      addDataCommand,
      onAddNext: async () => {
        await tick();
        handleAddColumn();
      },
    });
  }

  let isColumnManagerFocused = false;
</script>

{#if allowChangeChangeSetStructure}
  <div class="selectwrap">
    <SelectField
      isNative
      class="colmode"
      value={isDynamicStructure ? 'variable' : 'fixed'}
      options={[
        { label: 'Fixed columns (like SQL)', value: 'fixed' },
        { label: 'Variable columns (like MongoDB)', value: 'variable' },
      ]}
      on:change={e => {
        dispatchChangeSet({
          type: 'set',
          value: {
            ...changeSetState?.value,
            structure: {
              ...display?.editableStructure,
              __isDynamicStructure: e.detail == 'variable',
              // __keepDynamicStreamHeader: true,
            },
          },
        });
      }}
    />
  </div>
{/if}
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
            tick().then(() => {
              selectedColumns = [name];
              currentColumnUniqueName = name;
              if (!isJsonView) {
                display.focusColumns(selectedColumns);
              }
            });
          },
        });
      }}>Add</InlineButton
    >
  {/if}
  {#if allowChangeChangeSetStructure && !isDynamicStructure}
    <InlineButton on:click={handleAddColumn}>Add</InlineButton>
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
      isColumnManagerFocused = true;
      // activator.activate();
      // invalidateCommands();
    }}
    on:blur={() => {
      isColumnManagerFocused = false;
    }}
    on:copy={copyToClipboard}
  />

  {#each items as column (column.uniqueName)}
    {@const columnIndex = items.indexOf(column)}
    <ColumnManagerRow
      {display}
      {column}
      {isJsonView}
      {isDynamicStructure}
      {conid}
      {database}
      {tableInfo}
      {setTableInfo}
      {isColumnManagerFocused}
      columnInfo={tableInfo?.columns?.[columnIndex]}
      {columnIndex}
      {allowChangeChangeSetStructure}
      isSelected={selectedColumns.includes(column.uniqueName) || currentColumnUniqueName == column.uniqueName}
      {filter}
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
        if (selectedColumns.includes(column.uniqueName)) {
          for (const name of selectedColumns) {
            const column = items.find(x => x.uniqueName == name);
            if (column) {
              display.setColumnVisibility(column.uniquePath, e.detail);
            }
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

  .selectwrap :global(select) {
    flex: 1;
    padding: 3px 0px;
    border: none;
  }

  .selectwrap {
    border-bottom: 1px solid var(--theme-border);
  }
</style>
