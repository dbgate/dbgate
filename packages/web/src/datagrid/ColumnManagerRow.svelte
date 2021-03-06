<script lang="ts">
  import { plusExpandIcon } from '../icons/expandIcons';

  import FontIcon from '../icons/FontIcon.svelte';
  import ColumnLabel from './ColumnLabel.svelte';

  export let column;
  export let display;
</script>

<div
  class="row"
  on:click={e => {
    // @ts-ignore
    if (e.target.closest('.expandColumnIcon')) return;
    display.focusColumn(column.uniqueName);
  }}
>
  <span class="expandColumnIcon">
    <FontIcon
      icon={column.foreignKey ? plusExpandIcon(display.isExpandedColumn(column.uniqueName)) : 'icon invisible-box'}
      on:click={() => display.toggleExpandedColumn(column.uniqueName)}
    />
  </span>
  <input
    type="checkbox"
    style={`margin-left: ${5 + (column.uniquePath.length - 1) * 10}px`}
    checked={column.isChecked}
    on:change={() => display.setColumnVisibility(column.uniquePath, !column.isChecked)}
  />
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
</style>
