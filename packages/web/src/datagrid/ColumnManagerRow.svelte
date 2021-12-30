<script lang="ts">
  import { plusExpandIcon } from '../icons/expandIcons';

  import FontIcon from '../icons/FontIcon.svelte';
  import ColumnLabel from '../elements/ColumnLabel.svelte';

  export let column;
  export let display;
  export let isJsonView = false;
  export let isSelected = false;
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
      on:change={() => display.setColumnVisibility(column.uniquePath, !column.isChecked)}
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
