<script lang="ts">
  import ColumnLabel from '../elements/ColumnLabel.svelte';
  import { plusExpandIcon } from '../icons/expandIcons';
  import FontIcon from '../icons/FontIcon.svelte';

  export let column;
</script>

<div class="row">
  <span class="expandColumnIcon" style={`margin-right: ${5 + column.level * 10}px`}>
    <FontIcon
      icon={column.isExpandable ? plusExpandIcon(column.isExpanded) : 'icon invisible-box'}
      on:click={() => column.togglExpanded()}
    />
  </span>

  <input
    type="checkbox"
    checked={column.isChecked}
    on:click={e => {
      e.stopPropagation();
    }}
    on:mousedown={e => {
      e.stopPropagation();
    }}
    on:change={() => {
      const newValue = !column.isChecked;
      // display.setColumnVisibility(column.uniquePath, newValue);
      // dispatch('setvisibility', newValue);
    }}
  />

  <ColumnLabel {...column.props} showDataType />
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
