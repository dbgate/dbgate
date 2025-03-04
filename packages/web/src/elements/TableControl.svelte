<script lang="ts" context="module">
  export interface TableControlColumn {
    fieldName: string;
    header: string;
    component?: any;
    getProps?: any;
    props?: any;
    formatter?: any;
    slot?: number;
    isHighlighted?: Function;
    sortable?: boolean;
  }
</script>

<script lang="ts">
  import _ from 'lodash';

  import { onMount } from 'svelte';
  import keycodes from '../utility/keycodes';
  import { createEventDispatcher } from 'svelte';
  import FontIcon from '../icons/FontIcon.svelte';

  export let columns: (TableControlColumn | false)[];
  export let rows;
  export let focusOnCreate = false;
  export let selectable = false;
  export let selectedIndex = 0;
  export let clickable = false;
  export let disableFocusOutline = false;
  export let emptyMessage = null;
  export let noCellPadding = false;

  export let domTable = undefined;

  const dispatch = createEventDispatcher();

  $: columnList = _.compact(_.flatten(columns));

  onMount(() => {
    if (focusOnCreate) domTable.focus();
  });

  const handleKeyDown = event => {
    if (event.keyCode == keycodes.downArrow) {
      selectedIndex = Math.min(selectedIndex + 1, sortedRows.length - 1);
    }
    if (event.keyCode == keycodes.upArrow) {
      selectedIndex = Math.max(0, selectedIndex - 1);
    }
  };

  let sortedByField = null;
  let sortOrderIsDesc = false;

  $: sortedRowsTmp = sortedByField ? _.sortBy(rows || [], sortedByField) : rows;
  $: sortedRows = sortOrderIsDesc ? [...sortedRowsTmp].reverse() : sortedRowsTmp;
</script>

<table
  bind:this={domTable}
  class:selectable
  class:disableFocusOutline
  on:keydown
  tabindex={selectable ? -1 : undefined}
  on:keydown={handleKeyDown}
>
  <thead>
    <tr>
      {#each columnList as col}
        <td
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
        </td>
      {/each}
    </tr>
  </thead>
  <tbody>
    {#each sortedRows as row, index}
      <tr
        class:selected={selectable && selectedIndex == index}
        class:clickable
        on:click={() => {
          if (selectable) {
            selectedIndex = index;
            domTable.focus();
          }
          if (clickable) {
            dispatch('clickrow', row);
          }
        }}
      >
        {#each columnList as col}
          {@const rowProps = { ...col.props, ...(col.getProps ? col.getProps(row) : null) }}
          <td class:isHighlighted={col.isHighlighted && col.isHighlighted(row)} class:noCellPadding>
            {#if col.component}
              <svelte:component this={col.component} {...rowProps} />
            {:else if col.formatter}
              {col.formatter(row)}
            {:else if col.slot != null}
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
            {:else}
              {row[col.fieldName] || ''}
            {/if}
          </td>
        {/each}
      </tr>
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
    background: var(--theme-bg-selected);
  }
  tbody tr.clickable:hover {
    background: var(--theme-bg-hover);
  }

  thead td {
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
</style>
