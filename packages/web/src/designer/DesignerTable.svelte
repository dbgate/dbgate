<script lang="ts">
  import FontIcon from '../icons/FontIcon.svelte';
  import moveDrag from '../utility/moveDrag';
  import ColumnLine from './ColumnLine.svelte';

  export let table;
  export let onChangeTable;
  export let onBringToFront;
  export let onRemoveTable;
  export let onCreateReference;
  export let onAddReferenceByColumn;
  export let onSelectColumn;
  export let onChangeColumn;
  export let sourceDragColumn;
  export let setSourceDragColumn;
  export let targetDragColumn;
  export let setTargetDragColumn;
  export let onChangeDomTable;
  export let domWrapper;
  export let designer;

  let movingPosition = null;

  $: pureName = table?.pureName;
  $: alias = table?.alias;
  $: columns = table?.columns;
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
  }
  function handleMoveEnd() {
    onChangeTable({
      ...table,
      left: movingPosition.left,
      top: movingPosition.top,
    });
    movingPosition = null;
  }
</script>

<div
  class="wrapper"
  style={`left: ${movingPosition ? movingPosition.left : left}px; top:${movingPosition ? movingPosition.top : top}px`}
>
  <div
    class="header"
    class:isTable={objectTypeField == 'tables'}
    class:isView={objectTypeField == 'views'}
    use:moveDrag={[handleMoveStart, handleMove, handleMoveEnd]}
  >
    <div>{alias || pureName}</div>
    <div class="close" on:click={() => onRemoveTable(table)}>
      <FontIcon icon="icon close" />
    </div>
  </div>
  <div class="columns">
    {#each columns || [] as column}
      <ColumnLine {column} {table} {designer} {designerId} {onChangeColumn} />
    {/each}
  </div>
</div>

<style>
  .wrapper {
    position: absolute;
    background-color: var(--theme-bg-0);
    border: 1px solid var(--theme-border);
  }

  .header {
    font-weight: bold;
    text-align: center;
    padding: 2px;
    border-bottom: 1px solid var(--theme-border);
    cursor: pointer;
    display: flex;
    justify-content: space-between;
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
    max-height: 400px;
    overflow-y: auto;
    width: calc(100% - 10px);
    padding: 5px;
  }
</style>
