<script lang="ts">
  import { tick } from 'svelte';

  import FontIcon from '../icons/FontIcon.svelte';
  import InputTextModal from '../modals/InputTextModal.svelte';
  import { showModal } from '../modals/modalTools';
  import contextMenu from '../utility/contextMenu';
  import moveDrag from '../utility/moveDrag';
  import ColumnLine from './ColumnLine.svelte';
  import DomTableRef from './DomTableRef';

  export let table;
  export let onChangeTable;
  export let onBringToFront;
  export let onSelectTable;
  export let onRemoveTable;
  export let onAddAllReferences;
  export let onCreateReference;
  export let onAddReferenceByColumn;
  export let onSelectColumn;
  export let onChangeColumn;

  export let onMoveStart;
  export let onMove;
  export let onMoveEnd;

  // export let sourceDragColumn;
  // export let setSourceDragColumn;
  // export let targetDragColumn;
  // export let setTargetDragColumn;
  // export let onChangeDomTable;

  export let sourceDragColumn$;
  export let targetDragColumn$;

  export let domCanvas;
  // export let domTablesRef;
  export let designer;
  export let onMoveReferences;
  export let settings;

  let movingPosition = null;
  let domWrapper;

  const columnRefs = {};

  $: pureName = table?.pureName;
  $: alias = table?.alias;
  $: columns = table?.columns as any[];
  $: designerId = table?.designerId;
  $: objectTypeField = table?.objectTypeField;
  $: left = table?.left;
  $: top = table?.top;

  export function isSelected() {
    return table?.isSelectedTable;
  }

  export function getDesignerId() {
    return designerId;
  }

  export function moveStart() {
    movingPosition = { left, top };
  }

  export function move(x, y) {
    movingPosition.left += x;
    movingPosition.top += y;
  }

  export function moveEnd() {
    const res = movingPosition;
    movingPosition = null;
    return res;
  }

  function handleMoveStart() {
    if (settings?.canSelectTables) {
      onMoveStart();
    } else {
      moveStart();
    }
  }
  function handleMove(x, y) {
    if (settings?.canSelectTables) {
      onMove(x, y);
    } else {
      move(x, y);
      tick().then(onMoveReferences);
    }
  }
  function handleMoveEnd() {
    if (settings?.canSelectTables) {
      onMoveEnd();
    } else {
      const position = moveEnd();
      onChangeTable({
        ...table,
        left: position.left,
        top: position.top,
      });
      tick().then(onMoveReferences);
    }
  }

  export function getDomTable() {
    const domRefs = { ...columnRefs };
    domRefs[''] = domWrapper;
    return new DomTableRef(table, domRefs, domCanvas);
  }

  const handleSetTableAlias = () => {
    showModal(InputTextModal, {
      value: alias || '',
      label: 'New alias',
      header: 'Set table alias',
      onConfirm: newAlias => {
        onChangeTable({
          ...table,
          alias: newAlias,
        });
      },
    });
  };

  function createMenu() {
    return [
      { text: 'Remove', onClick: () => onRemoveTable({ designerId }) },
      { divider: true },
      settings?.allowTableAlias && [
        { text: 'Set table alias', onClick: handleSetTableAlias },
        alias && {
          text: 'Remove table alias',
          onClick: () =>
            onChangeTable({
              ...table,
              alias: null,
            }),
        },
      ],
      settings?.allowAddAllReferences && { text: 'Add references', onClick: () => onAddAllReferences(table) },
    ];
  }
</script>

<div
  class="wrapper"
  class:canSelectColumns={settings?.canSelectColumns}
  class:isSelectedTable={table?.isSelectedTable}
  style={`left: ${movingPosition ? movingPosition.left : left}px; top:${movingPosition ? movingPosition.top : top}px`}
  bind:this={domWrapper}
  on:mousedown={e => {
    if (e.button == 0) {
      e.stopPropagation();
      onBringToFront(table);
      if (settings?.canSelectTables && !table?.isSelectedTable) {
        onSelectTable(table, e.ctrlKey);
      }
    }
  }}
  use:contextMenu={settings?.canSelectColumns ? '__no_menu' : createMenu}
  use:moveDrag={settings?.canSelectColumns ? null : [handleMoveStart, handleMove, handleMoveEnd]}
>
  <div
    class="header"
    class:isTable={objectTypeField == 'tables'}
    class:isView={objectTypeField == 'views'}
    use:moveDrag={settings?.canSelectColumns ? [handleMoveStart, handleMove, handleMoveEnd] : null}
    use:contextMenu={settings?.canSelectColumns ? createMenu : '__no_menu'}
  >
    <div>{alias || pureName}</div>
    {#if settings?.showTableCloseButton}
      <div class="close" on:click={() => onRemoveTable(table)}>
        <FontIcon icon="icon close" />
      </div>
    {/if}
  </div>
  <div class="columns" on:scroll={() => tick().then(onMoveReferences)} class:scroll={settings?.allowScrollColumns}>
    {#each columns || [] as column}
      <ColumnLine
        {column}
        {table}
        {designer}
        {designerId}
        {onChangeColumn}
        {onSelectColumn}
        {sourceDragColumn$}
        {targetDragColumn$}
        {onCreateReference}
        {onAddReferenceByColumn}
        {settings}
        bind:domLine={columnRefs[column.columnName]}
      />
    {/each}
  </div>
  {#if table?.isSelectedTable}
    <div class="selection-marker lt" />
    <div class="selection-marker rt" />
    <div class="selection-marker lb" />
    <div class="selection-marker rb" />
  {/if}
</div>

<style>
  .wrapper {
    position: absolute;
    background-color: var(--theme-bg-0);
    border: 1px solid var(--theme-border);
  }
  /* :global(.dbgate-screen) .isSelectedTable {
    border: 3px solid var(--theme-border);
  } */
  .selection-marker {
    display: none;
    position: absolute;
    width: 6px;
    height: 6px;
    background: var(--theme-font-1);
  }
  .selection-marker.lt {
    left: -3px;
    top: -3px;
  }
  .selection-marker.rt {
    right: -3px;
    top: -3px;
  }
  .selection-marker.lb {
    left: -3px;
    bottom: -3px;
  }
  .selection-marker.rb {
    right: -3px;
    bottom: -3px;
  }
  :global(.dbgate-screen) .selection-marker {
    display: block;
  }
  :global(.dbgate-screen) .wrapper:not(.canSelectColumns) {
    cursor: pointer;
  }

  .header {
    font-weight: bold;
    text-align: center;
    padding: 2px;
    border-bottom: 1px solid var(--theme-border);
    display: flex;
    justify-content: space-between;
  }
  :global(.dbgate-screen) .header {
    cursor: pointer;
  }

  .header.isTable {
    background: var(--theme-bg-blue);
  }
  .header.isView {
    background: var(--theme-bg-magenta);
  }
  .close {
    background: var(--theme-bg-1);
  }
  .close:hover {
    background: var(--theme-bg-2);
  }
  .close:active:hover {
    background: var(--theme-bg-3);
  }
  .columns {
    width: calc(100% - 10px);
    padding: 5px;
  }
  .columns.scroll {
    max-height: 400px;
    overflow-y: auto;
  }
</style>
