<script lang="ts">
  import { findForeignKeyForColumn } from 'dbgate-tools';
  import InlineButton from '../buttons/InlineButton.svelte';
  import ToolbarButton from '../buttons/ToolbarButton.svelte';

  import ColumnLabel from '../elements/ColumnLabel.svelte';

  import CheckboxField from '../forms/CheckboxField.svelte';
  import { plusExpandIcon } from '../icons/expandIcons';
  import FontIcon from '../icons/FontIcon.svelte';
  import contextMenu from '../utility/contextMenu';
  import SortOrderIcon from './SortOrderIcon.svelte';
  export let column;
  export let table;
  export let designer;
  export let designerId;
  export let onChangeColumn;
  export let domLine;
  export let sourceDragColumn$;
  export let targetDragColumn$;
  export let onCreateReference;
  export let onAddReferenceByColumn;
  export let onSelectColumn;
  export let settings;
  export let nestingSupported = null;
  export let isExpandable = false;
  export let isExpanded = false;
  export let expandLevel = 0;
  export let toggleExpanded = null;

  $: designerColumn = (designer.columns || []).find(
    x => x.designerId == designerId && x.columnName == column.columnName
  );
  $: foreignKey = findForeignKeyForColumn(table, column);

  function createMenu() {
    if (settings?.columnMenu) {
      return settings?.columnMenu({
        designer,
        designerId,
        column,
        foreignKey,
      });
    }

    const setSortOrder = sortOrder => {
      onChangeColumn(
        {
          ...column,
          designerId,
        },
        col => ({ ...col, sortOrder })
      );
    };
    const addReference = () => {
      onAddReferenceByColumn(designerId, foreignKey);
    };

    return [
      settings?.allowColumnOperations && [
        { text: 'Sort ascending', onClick: () => setSortOrder(1) },
        { text: 'Sort descending', onClick: () => setSortOrder(-1) },
        { text: 'Unsort', onClick: () => setSortOrder(0) },
      ],
      foreignKey && { text: 'Add reference', onClick: addReference },
    ];
  }

  $: sortOrderProps = settings?.getSortOrderProps ? settings?.getSortOrderProps(designerId, column.columnName) : null;
  $: iconOverride = settings?.getColumnIconOverride
    ? settings?.getColumnIconOverride(designerId, column.columnName)
    : null;
</script>

<div
  class="line"
  class:canSelectColumns={settings?.canSelectColumns}
  bind:this={domLine}
  draggable={!!settings?.allowCreateRefByDrag}
  on:dragstart={e => {
    if (!settings?.allowCreateRefByDrag) return;

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
  on:mousedown={e =>
    onSelectColumn({
      ...column,
      designerId,
    })}
  use:contextMenu={settings?.canSelectColumns ? createMenu : '__no_menu'}
>
  {#if nestingSupported}
    <span class="expandColumnIcon" style={`margin-right: ${5 + expandLevel * 10}px`}>
      <FontIcon
        icon={isExpandable ? plusExpandIcon(isExpanded) : 'icon invisible-box'}
        on:click={() => {
          toggleExpanded(!isExpanded);
        }}
      />
    </span>
  {/if}

  {#if settings?.allowColumnOperations}
    <CheckboxField
      checked={settings?.isColumnChecked
        ? settings?.isColumnChecked(designerId, column)
        : !!(designer.columns || []).find(
            x => x.designerId == designerId && x.columnName == column.columnName && x.isOutput
          )}
      on:change={e => {
        if (settings?.setColumnChecked) {
          settings?.setColumnChecked(designerId, column, e.target.checked);
        } else {
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
        }
      }}
    />
  {/if}
  <ColumnLabel
    {...column}
    columnName={settings?.getColumnDisplayName ? settings?.getColumnDisplayName(column) : column.columnName}
    {foreignKey}
    forceIcon
    {iconOverride}
  />
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

  {#if sortOrderProps}
    <SortOrderIcon {...sortOrderProps} />
  {/if}

  {#if settings?.isColumnFiltered && settings?.isColumnFiltered(designerId, column.columnName)}
    <FontIcon icon="img filter" />
  {/if}

  {#if designer?.style?.showNullability || designer?.style?.showDataType}
    <div class="space" />
    {#if designer?.style?.showDataType && column?.dataType}
      <div class="ml-2">
        {(column?.displayedDataType || column?.dataType).toLowerCase()}
      </div>
    {/if}
    {#if designer?.style?.showNullability}
      <div class="ml-2">
        {column?.notNull ? 'NOT NULL' : 'NULL'}
      </div>
    {/if}
  {/if}

  {#if foreignKey && settings?.addDesignerForeignKey && settings?.canAddDesignerForeignKey && settings?.canAddDesignerForeignKey(designerId, column.columnName)}
    <span class="icon-button" on:mousedown={() => settings?.addDesignerForeignKey(designerId, column.columnName)}>
      <FontIcon icon="icon arrow-right" />
    </span>
  {/if}
</div>

<style>
  :global(.dbgate-screen) .line.canSelectColumns:hover {
    background: var(--theme-bg-1);
  }
  :global(.dbgate-screen) .line.isDragSource {
    background: var(--theme-bg-gold);
  }
  :global(.dbgate-screen) .line.isDragTarget {
    background: var(--theme-bg-gold);
  }
  .line {
    display: flex;
  }
  .space {
    flex-grow: 1;
  }

  .icon-button {
    margin-left: 4px;
    cursor: pointer;
  }
  .icon-button:hover {
    background: var(--theme-bg-2);
    color: var(--theme-font-hover);
  }
</style>
