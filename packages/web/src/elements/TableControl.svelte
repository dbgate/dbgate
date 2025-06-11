<script lang="ts" context="module">
  export interface TableControlColumn {
    fieldName: string;
    header: string;
    component?: any;
    getProps?: any;
    props?: any;
    formatter?: any;
    slot?: number;
    slotKey?: string;
    isHighlighted?: Function;
    sortable?: boolean;
    filterable?: boolean;
    filteredExpression?: (row: any) => string;
  }
</script>

<script lang="ts">
  import _ from 'lodash';

  import { onMount } from 'svelte';
  import keycodes from '../utility/keycodes';
  import { createEventDispatcher } from 'svelte';
  import FontIcon from '../icons/FontIcon.svelte';
  import DataFilterControl from '../datagrid/DataFilterControl.svelte';
  import { evalFilterBehaviour } from 'dbgate-tools';
  import { evaluateCondition } from 'dbgate-sqltree';
  import { compileCompoudEvalCondition } from 'dbgate-filterparser';
  import { chevronExpandIcon } from '../icons/expandIcons';

  export let columns: (TableControlColumn | false)[];
  export let rows = null;
  export let groupedRows = null;
  export let focusOnCreate = false;
  export let selectable = false;
  export let selectedIndex = 0;
  export let selectedKey = null;
  export let clickable = false;
  export let disableFocusOutline = false;
  export let emptyMessage = null;
  export let noCellPadding = false;
  export let allowMultiSelect = false;
  export let selectedIndexes = [];
  export let onChangeMultipleSelection = null;

  export let domTable = undefined;
  export let stickyHeader = false;

  export let checkedKeys = null;
  export let onSetCheckedKeys = null;
  export let extractTableItemKey = x => x.id;
  export let itemSupportsCheckbox = x => true;
  export let filters = null;

  export let selectionMode: 'index' | 'key' = 'index';

  const dispatch = createEventDispatcher();

  let dragStartIndex = null;
  let dragCurrentIndex = null;

  $: columnList = _.compact(_.flatten(columns));

  onMount(() => {
    if (focusOnCreate) domTable.focus();
  });

  const handleKeyDown = event => {
    const oldSelectedIndex =
      selectionMode == 'index' ? selectedIndex : _.findIndex(flatRowsShown, x => extractTableItemKey(x) == selectedKey);
    let newIndex = oldSelectedIndex;

    switch (event.keyCode) {
      case keycodes.downArrow:
        newIndex = Math.min(newIndex + 1, flatRowsShown.length - 1);
        break;
      case keycodes.upArrow:
        newIndex = Math.max(0, newIndex - 1);
        break;
      case keycodes.home:
        newIndex = 0;
        break;
      case keycodes.end:
        newIndex = rows.length - 1;
        break;
      case keycodes.pageUp:
        newIndex -= 10;
        break;
      case keycodes.pageDown:
        newIndex += 10;
        break;
    }
    if (newIndex < 0) {
      newIndex = 0;
    }
    if (newIndex >= flatRowsShown.length) {
      newIndex = flatRowsShown.length - 1;
    }

    if (clickable && oldSelectedIndex != newIndex) {
      event.preventDefault();
      domRows[newIndex]?.scrollIntoView();
      if (clickable) {
        dispatch('clickrow', flatRowsShown[newIndex]);
      }
      if (selectionMode == 'index') {
        selectedIndex = newIndex;
      } else {
        selectedKey = extractTableItemKey(flatRowsShown[newIndex]);
      }
    }
  };

  function filterRows(grows, filters) {
    const condition = compileCompoudEvalCondition(filters);

    if (!condition) return grows;

    return grows
      .map(gitem => {
        return {
          group: gitem.group,
          rows: gitem.rows.filter(row => {
            const newrow = { ...row };
            for (const col of columnList) {
              if (col.filteredExpression) {
                newrow[col.fieldName] = col.filteredExpression(row);
              }
            }
            return evaluateCondition(condition, newrow);
          }),
        };
      })
      .filter(gitem => gitem.rows.length > 0);
  }

  // function computeGroupedRows(array) {
  //   if (!extractGroupName) {
  //     return [{ label: null, rows: array }];
  //   }
  //   const res = [];
  //   let lastGroupName = null;
  //   let buildArray = [];
  //   for (const item of array) {
  //     const groupName = extractGroupName(item);
  //     if (lastGroupName != groupName) {
  //       if (buildArray.length > 0) {
  //         res.push({ label: lastGroupName, rows: buildArray });
  //       }
  //       lastGroupName = groupName;
  //       buildArray = [];
  //     }
  //     buildArray.push(item);
  //   }
  //   if (buildArray.length > 0) {
  //     res.push({ label: lastGroupName, rows: buildArray });
  //   }
  // }

  let sortedByField = null;
  let sortOrderIsDesc = false;
  let collapsedGroupIndexes = [];
  let domRows = {};

  $: rowsSource = groupedRows ? groupedRows : [{ group: null, rows }];

  $: filteredRows = filters ? filterRows(rowsSource, $filters) : rowsSource;

  $: sortedRows = sortedByField
    ? filteredRows.map(gitem => {
        let res = _.sortBy(gitem.rows, sortedByField);
        if (sortOrderIsDesc) res = [...res].reverse();
        return { group: gitem.group, rows: res };
      })
    : filteredRows;

  // $: console.log('sortedRows', sortedRows);

  $: flatRowsShown = sortedRows.map(gitem => gitem.rows).flat();
  $: checkableFlatRowsShown = flatRowsShown.filter(x => itemSupportsCheckbox(x));

  // $: groupedRows = computeGroupedRows(sortedRows);

  $: if (onChangeMultipleSelection && flatRowsShown) {
    onChangeMultipleSelection(selectedIndexes.map(index => flatRowsShown[index]));
  }

  $: if (flatRowsShown) {
    // reset selection on items changed
    selectedIndexes = [];
  }
</script>

<table
  bind:this={domTable}
  class:selectable
  class:disableFocusOutline
  on:keydown
  tabindex={selectable ? -1 : undefined}
  on:keydown={handleKeyDown}
  class:stickyHeader
>
  <thead class:stickyHeader>
    <tr>
      {#if checkedKeys}
        <th>
          <input
            type="checkbox"
            checked={checkableFlatRowsShown.every(r => checkedKeys.includes(extractTableItemKey(r)))}
            data-testid="TableControl_selectAllCheckBox"
            on:change={e => {
              if (e.target['checked']) onSetCheckedKeys(checkableFlatRowsShown.map(r => extractTableItemKey(r)));
              else onSetCheckedKeys([]);
            }}
          />
        </th>
      {/if}
      {#each columnList as col}
        <th
          class:clickable={col.sortable}
          on:click={() => {
            if (col.sortable) {
              if (sortedByField == col.fieldName) {
                if (sortOrderIsDesc) {
                  sortOrderIsDesc = false;
                  sortedByField = null;
                } else {
                  sortOrderIsDesc = true;
                }
              } else {
                sortOrderIsDesc = false;
                sortedByField = col.fieldName;
              }
            }
          }}
        >
          {col.header || ''}
          {#if sortedByField == col.fieldName}
            <FontIcon icon={sortOrderIsDesc ? 'img sort-desc' : 'img sort-asc'} padLeft />
          {/if}
        </th>
      {/each}
    </tr>
    {#if filters}
      <tr>
        {#if checkedKeys}
          <td class="empty-cell"></td>
        {/if}
        {#each columnList as col}
          <td class="filter-cell" class:empty-cell={!col.filterable}>
            {#if col.filterable}
              <DataFilterControl
                filterBehaviour={evalFilterBehaviour}
                filter={$filters[col.fieldName]}
                setFilter={value => filters.update(f => ({ ...f, [col.fieldName]: value }))}
                placeholder="Data filter"
              />
            {/if}
          </td>
        {/each}
      </tr>
    {/if}
  </thead>
  <tbody>
    {#each sortedRows as gitem, groupIndex}
      {#if gitem.group}
        <tr class="group-row">
          <td
            colspan={columnList.length + (checkedKeys ? 1 : 0)}
            class="groupcell"
            on:click={() => {
              if (collapsedGroupIndexes.includes(groupIndex)) {
                collapsedGroupIndexes = collapsedGroupIndexes.filter(x => x != groupIndex);
              } else {
                collapsedGroupIndexes = [...collapsedGroupIndexes, groupIndex];
              }
            }}
          >
            <FontIcon icon={chevronExpandIcon(!collapsedGroupIndexes.includes(groupIndex))} padRight />
            <strong>{gitem.group} ({gitem.rows.length})</strong>
          </td>
        </tr>
      {/if}
      {#if !collapsedGroupIndexes.includes(groupIndex)}
        {#each gitem.rows as row}
          {@const index = _.indexOf(flatRowsShown, row)}
          <tr
            class:selected={(selectable &&
              (selectionMode == 'index' ? selectedIndex == index : selectedKey == extractTableItemKey(row))) ||
              (allowMultiSelect && selectedIndexes.includes(index))}
            class:clickable
            bind:this={domRows[index]}
            on:click={() => {
              if (selectable) {
                if (selectionMode == 'index') {
                  selectedIndex = index;
                } else {
                  selectedKey = extractTableItemKey(row);
                }
                domTable.focus();
              }
              if (clickable) {
                dispatch('clickrow', row);
              }
            }}
            on:mousedown={event => {
              if (allowMultiSelect && !event.ctrlKey && !event.metaKey) {
                selectedIndexes = [];
                dragStartIndex = index;
              }
            }}
            on:mousemove={() => {
              if (dragStartIndex != null && allowMultiSelect) {
                dragCurrentIndex = index;
                if (dragCurrentIndex != dragStartIndex || selectedIndexes.length > 0) {
                  if (dragCurrentIndex < dragStartIndex) {
                    selectedIndexes = _.range(dragCurrentIndex, dragStartIndex + 1);
                  } else {
                    selectedIndexes = _.range(dragStartIndex, dragCurrentIndex + 1);
                  }
                } else if (selectedIndexes.length > 0) {
                  selectedIndexes = [dragCurrentIndex];
                }
              }
            }}
            on:mouseup={event => {
              dragCurrentIndex = null;
              dragStartIndex = null;
            }}
            data-testid={`TableControl_row_${index}`}
          >
            {#if checkedKeys}
              <td>
                {#if itemSupportsCheckbox(row)}
                  <input
                    type="checkbox"
                    checked={checkedKeys.includes(extractTableItemKey(row))}
                    on:change={e => {
                      if (e.target['checked']) onSetCheckedKeys(_.uniq([...checkedKeys, extractTableItemKey(row)]));
                      else onSetCheckedKeys(checkedKeys.filter(x => x != extractTableItemKey(row)));
                    }}
                    data-testid={`TableControl_row_${index}_checkbox`}
                  />
                {/if}
              </td>
            {/if}
            {#each columnList as col}
              {@const rowProps = { ...col.props, ...(col.getProps ? col.getProps(row) : null) }}
              <td class:isHighlighted={col.isHighlighted && col.isHighlighted(row)} class:noCellPadding>
                {#if col.component}
                  <svelte:component this={col.component} {...rowProps} />
                {:else if col.formatter}
                  {col.formatter(row)}
                {:else if col.slot != null}
                  {#key row[col.slotKey] || 'key'}
                    {#if col.slot == -1}<slot name="-1" {row} {col} {index} />
                    {:else if col.slot == 0}<slot name="0" {row} {col} {index} {...rowProps} />
                    {:else if col.slot == 1}<slot name="1" {row} {col} {index} {...rowProps} />
                    {:else if col.slot == 2}<slot name="2" {row} {col} {index} {...rowProps} />
                    {:else if col.slot == 3}<slot name="3" {row} {col} {index} {...rowProps} />
                    {:else if col.slot == 4}<slot name="4" {row} {col} {index} {...rowProps} />
                    {:else if col.slot == 5}<slot name="5" {row} {col} {index} {...rowProps} />
                    {:else if col.slot == 6}<slot name="6" {row} {col} {index} {...rowProps} />
                    {:else if col.slot == 7}<slot name="7" {row} {col} {index} {...rowProps} />
                    {:else if col.slot == 8}<slot name="8" {row} {col} {index} {...rowProps} />
                    {:else if col.slot == 9}<slot name="9" {row} {col} {index} {...rowProps} />
                    {/if}
                  {/key}
                {:else}
                  {row[col.fieldName] || ''}
                {/if}
              </td>
            {/each}
          </tr>
        {/each}
      {/if}
    {/each}
    {#if emptyMessage && sortedRows.length == 0}
      <tr>
        <td colspan={columnList.length}>{emptyMessage}</td>
      </tr>
    {/if}
  </tbody>
</table>

<style>
  table.disableFocusOutline:focus {
    outline: none;
  }
  table {
    border-collapse: collapse;
    width: 100%;
  }
  table.selectable {
    user-select: none;
  }
  tbody tr {
    background: var(--theme-bg-0);
  }
  tbody tr.selected {
    background: var(--theme-bg-3);
  }
  table:focus tbody tr.selected {
    background: var(--theme-bg-selected);
  }
  tbody tr.clickable:hover {
    background: var(--theme-bg-hover);
  }

  thead th {
    border: 1px solid var(--theme-border);
    background-color: var(--theme-bg-1);
    padding: 5px;
  }
  tbody td {
    border: 1px solid var(--theme-border);
  }

  tbody td:not(.noCellPadding) {
    padding: 5px;
  }

  td.isHighlighted {
    background-color: var(--theme-bg-1);
  }

  td.clickable {
    cursor: pointer;
  }

  thead.stickyHeader {
    position: sticky;
    top: 0;
    z-index: 1;
    border-top: 1px solid var(--theme-border);
  }

  table.stickyHeader th {
    border-left: none;
  }

  thead.stickyHeader :global(tr:first-child) :global(th) {
    border-top: 1px solid var(--theme-border);
  }

  table.stickyHeader td {
    border: 0px;
    border-bottom: 1px solid var(--theme-border);
    border-right: 1px solid var(--theme-border);
  }

  table.stickyHeader {
    border-spacing: 0;
    border-collapse: separate;
    border-left: 1px solid var(--theme-border);
  }

  .filter-cell {
    text-align: left;
    overflow: hidden;
    margin: 0;
    padding: 0;
  }

  .empty-cell {
    background-color: var(--theme-bg-1);
  }

  .groupcell {
    background-color: var(--theme-bg-1);
    cursor: pointer;
  }
</style>
