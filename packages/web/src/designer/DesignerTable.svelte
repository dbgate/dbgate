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
  export let onRemoveTable;
  export let onAddAllReferences;
  export let onCreateReference;
  export let onAddReferenceByColumn;
  export let onSelectColumn;
  export let onChangeColumn;

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

  function handleMoveStart() {
    movingPosition = { left, top };
  }
  function handleMove(x, y) {
    movingPosition.left += x;
    movingPosition.top += y;
    tick().then(onMoveReferences);
  }
  function handleMoveEnd() {
    onChangeTable({
      ...table,
      left: movingPosition.left,
      top: movingPosition.top,
    });
    movingPosition = null;
    tick().then(onMoveReferences);
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
  style={`left: ${movingPosition ? movingPosition.left : left}px; top:${movingPosition ? movingPosition.top : top}px`}
  bind:this={domWrapper}
  on:mousedown={() => onBringToFront(table)}
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
</div>

<style>
  .wrapper {
    position: absolute;
    background-color: var(--theme-bg-0);
    border: 1px solid var(--theme-border);
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
