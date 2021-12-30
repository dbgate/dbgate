<script lang="ts">
  import { plusExpandIcon } from '../icons/expandIcons';

  import FontIcon from '../icons/FontIcon.svelte';
  import ColumnLabel from '../elements/ColumnLabel.svelte';
  import { createEventDispatcher } from 'svelte';

  export let column;
  export let display;
  export let isJsonView = false;
  export let isSelected = false;

  const dispatch = createEventDispatcher();
</script>

<div
  class="row"
  on:click={e => {
    // @ts-ignore
    if (e.target.closest('.expandColumnIcon')) return;
    if (isJsonView) display.showFilter(column.uniqueName);
    else display.focusColumn(column.uniqueName);
  }}
  class:isSelected
  on:click
  on:mousedown
  on:mousemove
  on:mouseup
>
  <span class="expandColumnIcon" style={`margin-right: ${5 + (column.uniquePath.length - 1) * 10}px`}>
    <FontIcon
      icon={column.isExpandable ? plusExpandIcon(display.isExpandedColumn(column.uniqueName)) : 'icon invisible-box'}
      on:click={() => display.toggleExpandedColumn(column.uniqueName)}
    />
  </span>
  {#if isJsonView}
    <FontIcon icon="img column" />
  {:else}
    <input
      type="checkbox"
      checked={column.isChecked}
      on:click={e => {
        e.stopPropagation();
      }}
      on:change={() => {
        const newValue = !column.isChecked;
        display.setColumnVisibility(column.uniquePath, newValue);
        dispatch('setvisibility', newValue);
      }}
    />
  {/if}
  <ColumnLabel {...column} />
</div>

<style>
  .row {
    margin-left: 5px;
    margin-right: 5px;
    cursor: pointer;
    white-space: nowrap;
  }
  .row:hover {
    background: var(--theme-bg-hover);
  }

  .row.isSelected {
    background: var(--theme-bg-selected);
  }
</style>
