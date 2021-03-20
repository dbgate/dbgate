<script lang="ts" context="module">
  let lastFocusedFormView = null;
  const getCurrentDataForm = () =>
    lastFocusedFormView?.getTabId && lastFocusedFormView?.getTabId() == getActiveTabId() ? lastFocusedFormView : null;

  registerCommand({
    id: 'dataForm.switchToTable',
    category: 'Data form',
    name: 'Switch to table',
    keyText: 'F4',
    testEnabled: () => getCurrentDataForm() != null,
    onClick: () => getCurrentDataForm().switchToTable(),
  });
</script>

<script lang="ts">
  import _ from 'lodash';

  import { getContext } from 'svelte';
  import { get_current_component } from 'svelte/internal';

  import invalidateCommands from '../commands/invalidateCommands';

  import registerCommand from '../commands/registerCommand';
  import DataGridCell from '../datagrid/DataGridCell.svelte';
  import ColumnLabel from '../elements/ColumnLabel.svelte';

  import { getActiveTabId } from '../stores';
  import contextMenu from '../utility/contextMenu';

  export let config;
  export let setConfig;
  export let focusOnVisible = false;
  export let allRowCount;
  export let rowCountBefore;
  export let isLoading;
  export let former;
  export let formDisplay;

  let wrapperHeight = 1;
  let rowHeight = 1;
  let currentCell = [0, 0];

  const instance = get_current_component();
  const tabid = getContext('tabid');
  const tabVisible: any = getContext('tabVisible');

  let domFocusField;

  $: if ($tabVisible && domFocusField && focusOnVisible) {
    domFocusField.focus();
  }

  $: rowData = former?.rowData;
  $: rowStatus = former?.rowStatus;

  $: rowCount = Math.floor((wrapperHeight - 20) / rowHeight);

  $: columnChunks = _.chunk(formDisplay.columns, rowCount) as any[][];

  export function getTabId() {
    return tabid;
  }

  export function switchToTable() {
    setConfig(cfg => ({
      ...cfg,
      isFormView: false,
      formViewKey: null,
    }));
  }

  function createMenu() {
    return [{ command: 'dataForm.switchToTable' }];
  }
</script>

<div class="outer">
  <div class="wrapper" use:contextMenu={createMenu} bind:clientHeight={wrapperHeight}>
    {#each columnChunks as chunk, chunkIndex}
      <table>
        {#each chunk as col, rowIndex}
          <tr>
            {#if chunkIndex == 0 && rowIndex == 0}
              <td
                class="header-cell"
                data-row={rowIndex}
                data-col={chunkIndex * 2}
                bind:clientHeight={rowHeight}
                style={`height: ${rowHeight}px`}
              >
                <ColumnLabel {...col} headerText={col.columnName} />
              </td>
            {:else}
              <td class="header-cell" data-row={rowIndex} data-col={chunkIndex * 2} style={`height: ${rowHeight}px`}>
                <ColumnLabel {...col} headerText={col.columnName} />
              </td>
            {/if}
            <DataGridCell
              {rowIndex}
              {col}
              {rowData}
              colIndex={chunkIndex * 2 + 1}
              isSelected={currentCell[0] == rowIndex && currentCell[1] == chunkIndex * 2 + 1}
              isModifiedCell={rowStatus.modifiedFields && rowStatus.modifiedFields.has(col.uniqueName)}
            />
          </tr>
        {/each}
      </table>
    {/each}
    <input
      type="text"
      class="focus-field"
      bind:this={domFocusField}
      on:focus={() => {
        lastFocusedFormView = instance;
        invalidateCommands();
      }}
    />
  </div>
</div>

<style>
  table {
    border-collapse: collapse;
    outline: none;
  }

  .outer {
    position: absolute;
    left: 0;
    top: 0;
    bottom: 0;
    right: 0;
  }

  .wrapper {
    position: absolute;
    left: 0;
    top: 0;
    bottom: 0;
    right: 0;
    display: flex;
    overflow-x: scroll;
  }

  tr {
    background-color: var(--theme-bg-0);
  }
  tr:nth-child(6n + 3) {
    background-color: var(--theme-bg-1);
  }
  tr:nth-child(6n + 6) {
    background-color: var(--theme-bg-alt);
  }

  .header-cell {
    border: 1px solid var(--theme-border);
    text-align: left;
    padding: 0;
    margin: 0;
    background-color: var(--theme-bg-1);
    overflow: hidden;
  }

  .focus-field {
    position: absolute;
    left: -1000px;
    top: -1000px;
  }
</style>
