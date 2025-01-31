<script lang="ts">
  import { plusExpandIcon } from '../icons/expandIcons';

  import FontIcon from '../icons/FontIcon.svelte';
  import ColumnLabel from '../elements/ColumnLabel.svelte';
  import { createEventDispatcher } from 'svelte';
  import { showModal } from '../modals/modalTools';
  import ColumnEditorModal from '../tableeditor/ColumnEditorModal.svelte';
  import { editorDeleteColumn } from 'dbgate-tools';

  export let column;
  export let display;
  export let isJsonView = false;
  export let isSelected = false;
  export let conid;
  export let database;
  export let isDynamicStructure;
  export let filter = undefined;

  export let tableInfo;
  export let setTableInfo;

  export let columnInfo = null;
  export let columnIndex = -1;

  export let isColumnManagerFocused = false;

  export let allowChangeChangeSetStructure = false;
  $: addDataCommand = allowChangeChangeSetStructure;

  function handleEditColumn() {
    showModal(ColumnEditorModal, { columnInfo, tableInfo, setTableInfo, addDataCommand });
  }

  function exchange(array, i1, i2) {
    const i1r = (i1 + array.length) % array.length;
    const i2r = (i2 + array.length) % array.length;
    const res = [...array];
    [res[i1r], res[i2r]] = [res[i2r], res[i1r]];
    return res;
  }

  const dispatch = createEventDispatcher();
</script>

<div
  class="row"
  on:click={e => {
    // @ts-ignore
    if (e.target.closest('.expandColumnIcon')) return;
    if (isJsonView) display.showFilter(column.uniqueName);
    else display.focusColumns([column.uniqueName]);
  }}
  class:isSelected
  class:isFocused={isColumnManagerFocused}
  on:click
  on:mousedown
  on:mousemove
  on:mouseup
>
  <div>
    <span class="expandColumnIcon" style={`margin-right: ${5 + (column.uniquePath.length - 1) * 10}px`}>
      <FontIcon
        icon={column.isExpandable ? plusExpandIcon(display.isExpandedColumn(column.uniqueName)) : 'icon invisible-box'}
        on:click={() => display.toggleExpandedColumn(column.uniqueName)}
        data-testid="ColumnManagerRow_expand_{column.uniqueName}"
      />
    </span>
    {#if isJsonView}
      <FontIcon icon="img column" />
    {:else}
      <input
        type="checkbox"
        checked={column.isChecked}
        on:click={e => {
          e.stopPropagation();
        }}
        on:mousedown={e => {
          e.stopPropagation();
        }}
        on:change={() => {
          const newValue = !column.isChecked;
          display.setColumnVisibility(column.uniquePath, newValue);
          dispatch('setvisibility', newValue);
        }}
        data-testid="ColumnManagerRow_checkbox_{column.uniqueName}"
      />
    {/if}
    <ColumnLabel {...column} showDataType {conid} {database} {filter} />
  </div>

  {#if allowChangeChangeSetStructure && !isDynamicStructure}
    <div class="nowrap">
      <span class="icon" on:click={handleEditColumn}>
        <FontIcon icon="icon edit" />
      </span>
      <span class="icon" on:click={() => setTableInfo(info => editorDeleteColumn(info, columnInfo, addDataCommand))}>
        <FontIcon icon="icon delete" />
      </span>
      <span
        class="icon"
        on:click={() =>
          setTableInfo(info => ({ ...info, columns: exchange(info.columns, columnIndex, columnIndex - 1) }))}
      >
        <FontIcon icon="icon arrow-up" />
      </span>
      <span
        class="icon"
        on:click={() =>
          setTableInfo(info => ({ ...info, columns: exchange(info.columns, columnIndex, columnIndex + 1) }))}
      >
        <FontIcon icon="icon arrow-down" />
      </span>
    </div>
  {/if}
</div>

<style>
  .row {
    margin-left: 5px;
    margin-right: 5px;
    cursor: pointer;
    white-space: nowrap;
    display: flex;
    justify-content: space-between;
  }
  .row:hover {
    background: var(--theme-bg-hover);
  }

  .row.isSelected {
    background: var(--theme-bg-3);
  }

  .row.isSelected.isFocused {
    background: var(--theme-bg-selected);
  }

  .icon {
    position: relative;
    /* top: 5px;
    padding: 5px; */
  }
  .icon:hover {
    background-color: var(--theme-bg-3);
  }
</style>
