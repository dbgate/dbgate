<script lang="ts">
  import { findForeignKeyForColumn } from 'dbgate-tools';

  import ColumnLabel from '../elements/ColumnLabel.svelte';

  import CheckboxField from '../forms/CheckboxField.svelte';
  import FontIcon from '../icons/FontIcon.svelte';
  export let column;
  export let table;
  export let designer;
  export let designerId;
  export let onChangeColumn;
  export let domLine;
  export let sourceDragColumn$;
  export let targetDragColumn$;
  export let onCreateReference;

  $: designerColumn = (designer.columns || []).find(
    x => x.designerId == designerId && x.columnName == column.columnName
  );
</script>

<div
  class="line"
  bind:this={domLine}
  draggable={true}
  on:dragstart={e => {
    const dragData = {
      ...column,
      designerId,
    };
    sourceDragColumn$.set(dragData);
    e.dataTransfer.setData('designer_column_drag_data', JSON.stringify(dragData));
  }}
  on:dragend={e => {
    sourceDragColumn$.set(null);
    targetDragColumn$.set(null);
  }}
  on:dragover={e => {
    if ($sourceDragColumn$) {
      e.preventDefault();
      targetDragColumn$.set({
        ...column,
        designerId,
      });
    }
  }}
  on:drop={e => {
    var data = e.dataTransfer.getData('designer_column_drag_data');
    e.preventDefault();
    if (!data) return;
    onCreateReference($sourceDragColumn$, $targetDragColumn$);
    sourceDragColumn$.set(null);
    targetDragColumn$.set(null);
  }}
  class:isDragSource={$sourceDragColumn$ &&
    $sourceDragColumn$.designerId == designerId &&
    $sourceDragColumn$.columnName == column.columnName}
  class:isDragTarget={$targetDragColumn$ &&
    $targetDragColumn$.designerId == designerId &&
    $targetDragColumn$.columnName == column.columnName}
>
  <CheckboxField
    checked={!!(designer.columns || []).find(
      x => x.designerId == designerId && x.columnName == column.columnName && x.isOutput
    )}
    onChange={e => {
      if (e.target.checked) {
        onChangeColumn(
          {
            ...column,
            designerId,
          },
          col => ({ ...col, isOutput: true })
        );
      } else {
        onChangeColumn(
          {
            ...column,
            designerId,
          },
          col => ({ ...col, isOutput: false })
        );
      }
    }}
  />
  <ColumnLabel {...column} foreignKey={findForeignKeyForColumn(table, column)} forceIcon />
  {#if designerColumn?.filter}
    <FontIcon icon="img filter" />
  {/if}
  {#if designerColumn?.sortOrder > 0}
    <FontIcon icon="img sort-asc" />
  {/if}
  {#if designerColumn?.sortOrder < 0}
    <FontIcon icon="img sort-desc" />
  {/if}
  {#if designerColumn?.isGrouped}
    <FontIcon icon="img group" />
  {/if}
</div>

<style>
  .line:hover {
    background: var(--theme-bg-1);
  }
  .line.isDragSource {
    background: var(--theme-bg-gold);
  }
  .line.isDragTarget {
    background: var(--theme-bg-gold);
  }
</style>
