<script lang="ts">
  import { presetDarkPalettes, presetPalettes } from '@ant-design/colors';
  import { filterName, stringFilterBehaviour } from 'dbgate-tools';

  import { tick } from 'svelte';
  import { createDatabaseObjectMenu } from '../appobj/DatabaseObjectAppObject.svelte';
  import DataFilterControl from '../datagrid/DataFilterControl.svelte';
  import CheckboxField from '../forms/CheckboxField.svelte';

  import FontIcon from '../icons/FontIcon.svelte';
  import InputTextModal from '../modals/InputTextModal.svelte';
  import { showModal } from '../modals/modalTools';
  import { currentThemeDefinition } from '../stores';
  import VirtualForeignKeyEditorModal from '../tableeditor/VirtualForeignKeyEditorModal.svelte';
  import { isCtrlOrCommandKey } from '../utility/common';
  import contextMenu from '../utility/contextMenu';
  import moveDrag from '../utility/moveDrag';
  import ColumnLine from './ColumnLine.svelte';
  import DomTableRef from './DomTableRef';

  export let conid;
  export let database;
  export let table;
  export let zoomKoef;
  export let onChangeTable;
  export let onBringToFront;
  export let onSelectTable;
  export let onRemoveTable;
  export let onAddAllReferences;
  export let onCreateReference;
  export let onAddReferenceByColumn;
  export let onSelectColumn;
  export let onChangeColumn;
  export let onChangeTableColor;
  export let isMultipleTableSelection;

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
  export let columnFilter;

  let movingPosition = null;
  let domWrapper;

  const columnRefs = {};

  $: pureName = table?.pureName;
  $: alias = table?.alias;
  $: columns = (table?.columns as any[]).filter(x => shouldShowColumn(table, x, designer?.style));
  $: designerId = table?.designerId;
  $: objectTypeField = table?.objectTypeField;
  $: left = table?.left;
  $: top = table?.top;
  $: mainIcon = settings?.getMainTableIcon ? settings?.getMainTableIcon(designerId) : null;
  $: specificDb = settings?.tableSpecificDb ? settings?.tableSpecificDb(designerId) : null;
  $: filterParentRows = settings?.hasFilterParentRowsFlag ? settings?.hasFilterParentRowsFlag(designerId) : false;
  $: isGrayed = settings?.isGrayedTable ? settings?.isGrayedTable(designerId) : false;
  $: flatColumns = getFlatColumns(columns, columnFilter, 0);

  function getFlatColumns(columns, filter, level) {
    if (!columns) return [];
    const res = [];
    for (const col of columns) {
      if (filterName(filter, col.columnName)) {
        res.push({ ...col, expandLevel: level });
        if (col.isExpanded) {
          res.push(...getFlatColumns(col.getChildColumns ? col.getChildColumns() : null, filter, level + 1));
        }
      } else if (col.isExpanded) {
        const children = getFlatColumns(col.getChildColumns ? col.getChildColumns() : null, filter, level + 1);
        if (children.length > 0) {
          res.push({ ...col, expandLevel: level });
          res.push(...children);
        }
      }
    }
    return res;
  }

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
    movingPosition.left += x / zoomKoef;
    movingPosition.top += y / zoomKoef;
  }

  export function moveEnd() {
    const res = movingPosition;
    movingPosition = null;
    return res;
  }

  function shouldShowColumn(table, column, style) {
    if (!settings?.customizeStyle) {
      return true;
    }
    switch (style?.filterColumns || 'all') {
      case 'primaryKey':
        return table?.primaryKey?.columns?.find(x => x.columnName == column?.columnName);
      case 'allKeys':
        return (
          table?.primaryKey?.columns?.find(x => x.columnName == column?.columnName) ||
          table?.foreignKeys?.find(fk => fk.columns.find(x => x.columnName == column?.columnName))
        );
      case 'keysAndNotNull':
        return (
          column?.notNull ||
          table?.primaryKey?.columns?.find(x => x.columnName == column?.columnName) ||
          table?.foreignKeys?.find(fk => fk.columns.find(x => x.columnName == column?.columnName))
        );
      case 'notNull':
        return column?.notNull;
    }
    return true;
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

  function getTableColorStyle(themeDef, table, colorIndex = 3) {
    if (!table?.tableColor) return null;
    const palettes = themeDef?.themeType == 'dark' ? presetDarkPalettes : presetPalettes;
    const palette = palettes[table?.tableColor];
    if (!palette) return null;
    return `background: ${palette[colorIndex]}`;
  }

  export function getDomTable() {
    const domRefs = { ...columnRefs };
    domRefs[''] = domWrapper;
    return new DomTableRef(table, domRefs, domCanvas, settings);
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

  const handleDefineVirtualForeignKey = table => {
    showModal(VirtualForeignKeyEditorModal, {
      schemaName: table.schemaName,
      pureName: table.pureName,
      conid,
      database,
    });
  };

  function createMenu() {
    if (settings?.tableMenu) {
      return settings?.tableMenu({ designer, designerId, onRemoveTable });
    }
    return [
      { text: 'Remove', onClick: () => onRemoveTable({ designerId }) },
      { divider: true },
      settings?.allowTableAlias &&
        !isMultipleTableSelection && [
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
      settings?.allowAddAllReferences &&
        !isMultipleTableSelection && { text: 'Add references', onClick: () => onAddAllReferences(table) },
      settings?.allowChangeColor && { text: 'Change color', onClick: () => onChangeTableColor(table) },
      settings?.allowDefineVirtualReferences &&
        !isMultipleTableSelection && {
          text: 'Define virtual foreign key',
          onClick: () => handleDefineVirtualForeignKey(table),
        },
      settings?.appendTableSystemMenu &&
        !isMultipleTableSelection && [{ divider: true }, createDatabaseObjectMenu({ ...table, conid, database })],
    ];
  }

  // $: console.log('COLUMNS', flatColumns);
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
        onSelectTable(table, isCtrlOrCommandKey(e));
      }
    }
  }}
  use:contextMenu={settings?.canSelectColumns ? '__no_menu' : createMenu}
  use:moveDrag={settings?.canSelectColumns ? null : [handleMoveStart, handleMove, handleMoveEnd]}
>
  <div
    class="header"
    class:isGrayed
    class:isTable={objectTypeField == 'tables'}
    class:isView={objectTypeField == 'views'}
    class:isCollection={objectTypeField == 'collections'}
    use:moveDrag={settings?.canSelectColumns ? [handleMoveStart, handleMove, handleMoveEnd] : null}
    use:contextMenu={settings?.canSelectColumns ? createMenu : '__no_menu'}
    style={getTableColorStyle($currentThemeDefinition, table)}
    on:click={settings?.onClickTableHeader ? () => settings?.onClickTableHeader(designerId) : null}
  >
    <div>
      {#if settings?.canCheckTables}
        <CheckboxField
          checked={settings?.isTableChecked ? settings?.isTableChecked(designerId) : false}
          on:change={e => {
            if (settings?.setTableChecked) {
              settings?.setTableChecked(designerId, e.target.checked);
            }
          }}
        />
      {/if}

      {#if mainIcon}
        <FontIcon icon={mainIcon} />
      {/if}

      {alias || pureName}

      {#if specificDb}
        <FontIcon icon="icon database" title={specificDb.database} />
      {/if}

      {#if filterParentRows}
        <FontIcon icon="icon parent-filter" title="Filter parent rows" />
      {/if}
    </div>
    {#if settings?.showTableCloseButton}
      <div class="close" on:click={() => onRemoveTable(table)}>
        <FontIcon icon="icon close" />
      </div>
    {/if}
  </div>
  {#if settings?.getMutliColumnFilter && settings?.setMutliColumnFilter}
    <DataFilterControl
      filterBehaviour={stringFilterBehaviour}
      filter={settings?.getMutliColumnFilter(designerId)}
      setFilter={value => settings?.setMutliColumnFilter(designerId, value)}
      placeholder="Data filter"
    />
  {/if}

  <div class="columns" on:scroll={() => tick().then(onMoveReferences)} class:scroll={settings?.allowScrollColumns}>
    {#each flatColumns || [] as column (column.columnName)}
      <ColumnLine
        nestingSupported={!!settings?.isColumnExpandable && columns.find(x => settings?.isColumnExpandable(x))}
        isExpandable={settings?.isColumnExpandable && settings?.isColumnExpandable(column)}
        isExpanded={settings?.isColumnExpanded && settings?.isColumnExpanded(column)}
        expandLevel={settings?.columnExpandLevel ? settings?.columnExpandLevel(column) : 0}
        toggleExpanded={value => settings?.toggleExpandedColumn(column, value)}
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
  .header.isCollection {
    background: var(--theme-bg-red);
  }

  .header.isGrayed {
    background: var(--theme-bg-2);
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
