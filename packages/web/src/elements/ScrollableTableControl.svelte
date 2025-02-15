<script lang="ts" context="module">
  export interface TableControlColumn {
    fieldName: string;
    header: string;
    component?: any;
    getProps?: any;
    formatter?: any;
    slot?: number;
    headerSlot?: number;
    isHighlighted?: Function;
    width?: string;
    testid?: (row: any) => string;
  }
</script>

<script lang="ts">
  import _ from 'lodash';

  import { onDestroy, onMount } from 'svelte';
  import keycodes from '../utility/keycodes';
  import { createEventDispatcher } from 'svelte';
  import resizeObserver from '../utility/resizeObserver';

  export let columns: TableControlColumn[];
  export let rows;
  export let focusOnCreate = false;
  export let selectable = false;
  export let selectedIndex = 0;
  export let clickable = false;
  export let disableFocusOutline = false;
  export let onLoadNext = null;
  export let singleLineRow = false;

  export let domTable = undefined;

  let clientHeight = 0;
  let headerHeight = 0;
  let domBody;

  let domLoadNext;
  let observer;

  function startObserver(dom) {
    if (observer) {
      // console.log('STOP OBSERVE');
      observer.disconnect();
      observer = null;
    }
    if (dom) {
      // console.log('OBSERVE');
      observer = new IntersectionObserver(entries => {
        // console.log('ENTRIES', entries);
        if (entries.find(x => x.isIntersecting)) {
          // console.log('INVOKE LOAD NEXT');
          onLoadNext();
        }
      });
      observer.observe(dom);
    }
  }

  $: startObserver(domLoadNext);

  onDestroy(() => {
    if (observer) {
      observer.disconnect();
    }
  });

  const dispatch = createEventDispatcher();

  $: columnList = _.compact(_.flatten(columns));

  onMount(() => {
    if (focusOnCreate) domTable.focus();
  });

  const handleKeyDown = event => {
    if (event.keyCode == keycodes.downArrow) {
      selectedIndex = Math.min(selectedIndex + 1, rows.length - 1);
    }
    if (event.keyCode == keycodes.upArrow) {
      selectedIndex = Math.max(0, selectedIndex - 1);
    }
    if (event.keyCode == keycodes.pageUp) {
      selectedIndex -= Math.floor(clientHeight / headerHeight) - 1;
      if (selectedIndex < 0) selectedIndex = 0;
    }
    if (event.keyCode == keycodes.pageDown) {
      selectedIndex += Math.floor(clientHeight / headerHeight) - 1;
      if (selectedIndex >= rows.length) selectedIndex = rows.length - 1;
    }
    if (event.keyCode == keycodes.home) {
      selectedIndex = 0;
    }
    if (event.keyCode == keycodes.end) {
      selectedIndex = rows.length - 1;
    }
  };

  function scrollToIndex(index) {
    if (!domBody) return;
    const element = domBody.children[index];
    if (element) element.scrollIntoView({ block: 'nearest', inline: 'nearest' });
  }

  $: scrollToIndex(selectedIndex);
</script>

<div
  class="wrapper"
  use:resizeObserver={true}
  on:resize={e => {
    // @ts-ignore
    clientHeight = e.detail.height;
  }}
>
  <table
    bind:this={domTable}
    class:selectable
    class:disableFocusOutline
    class:singleLineRow
    on:keydown
    tabindex={selectable ? -1 : undefined}
    on:keydown={handleKeyDown}
  >
    <thead
      use:resizeObserver={true}
      on:resize={e => {
        // @ts-ignore
        headerHeight = e.detail.height;
      }}
    >
      <tr>
        {#each columnList as col}
          <td style={col.width ? `width: ${col.width}` : undefined}>
            {#if col.headerSlot != null}
              {#if col.headerSlot == -1}<slot name="-1" />
              {:else if col.headerSlot == 0}<slot name="0" />
              {:else if col.headerSlot == 1}<slot name="1" />
              {:else if col.headerSlot == 2}<slot name="2" />
              {:else if col.headerSlot == 3}<slot name="3" />
              {:else if col.headerSlot == 4}<slot name="4" />
              {:else if col.headerSlot == 5}<slot name="5" />
              {:else if col.headerSlot == 6}<slot name="6" />
              {:else if col.headerSlot == 7}<slot name="7" />
              {/if}
            {:else}
              {col.header || ''}
            {/if}
          </td>
        {/each}
      </tr>
    </thead>
    <tbody style={`max-height: ${clientHeight - headerHeight}px`} bind:this={domBody}>
      {#each rows as row, index}
        <tr
          class:selected={selectable && selectedIndex == index}
          class:clickable
          class:isAdded={row.__isAdded}
          class:isDeleted={row.__isDeleted}
          class:isChanged={row.__isChanged}
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
            <td
              class:isHighlighted={col.isHighlighted && col.isHighlighted(row)}
              style={col.width ? `width: ${col.width}` : undefined}
              data-testid={col.testid ? col.testid(row) : undefined}
            >
              {#if col.component}
                <svelte:component this={col.component} {...col.getProps(row)} />
              {:else if col.formatter}
                {col.formatter(row)}
              {:else if col.slot != null}
                {#if col.slot == -1}<slot name="-1" {row} {index} />
                {:else if col.slot == 0}<slot name="0" {row} {index} />
                {:else if col.slot == 1}<slot name="1" {row} {index} />
                {:else if col.slot == 2}<slot name="2" {row} {index} />
                {:else if col.slot == 3}<slot name="3" {row} {index} />
                {:else if col.slot == 4}<slot name="4" {row} {index} />
                {:else if col.slot == 5}<slot name="5" {row} {index} />
                {:else if col.slot == 6}<slot name="6" {row} {index} />
                {:else if col.slot == 7}<slot name="7" {row} {index} />
                {/if}
              {:else}
                {row[col.fieldName] || ''}
              {/if}
            </td>
          {/each}
        </tr>
      {/each}
      {#if onLoadNext}
        {#key rows}
          <tr>
            <td colspan={columnList.length} bind:this={domLoadNext}> Loading next rows... </td>
          </tr>
        {/key}
      {/if}
    </tbody>
  </table>
</div>

<style>
  .wrapper {
    position: absolute;
    left: 0;
    top: 0;
    bottom: 0;
    right: 0;
  }

  table {
    width: 100%;
    flex: 1;
  }

  table thead,
  table tbody tr {
    display: table;
    width: 100%;
    table-layout: fixed;
  }
  table thead {
    width: calc(100% - 0.8em);
  }
  table tbody tr td {
    overflow: hidden;
  }

  table.singleLineRow tbody tr td {
    white-space: nowrap;
  }

  table tbody {
    display: block;
    overflow-y: scroll;
    overflow-x: hidden;
    table-layout: fixed;
    max-height: calc(100% - 20px);
  }

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
    padding: 5px;
  }

  td.isHighlighted {
    background-color: var(--theme-bg-1);
  }

  tr.isAdded {
    background: var(--theme-bg-green);
  }
  tr.isChanged {
    background: var(--theme-bg-orange);
  }

  tr.isDeleted {
    background: var(--theme-bg-red);
  }
</style>
