<script lang="ts">
  import ColumnLabel from './ColumnLabel.svelte';

  export let conid = undefined;
  export let database = undefined;
  export let column;
</script>

<div class="header">
  <div class="label">
    <ColumnLabel {...column} />
  </div>
</div>

<style>
  .header {
    display: flex;
    flex-wrap: nowrap;
  }
  .label {
    flex: 1;
    min-width: 10px;
    padding: 2px;
    margin: auto;
    white-space: nowrap;
  }
  .icon {
    margin-left: 3px;
  }
  .resizer {
    background-color: var(--theme-border);
    width: 2px;
    cursor: col-resize;
    z-index: 1;
  }
  .grouping {
    color: var(--theme-font-alt);
    white-space: nowrap;
  }
</style>
