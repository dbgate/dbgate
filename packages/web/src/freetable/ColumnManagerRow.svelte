<script lang="ts">
  import FontIcon from '../icons/FontIcon.svelte';

  export let column;
  export let onEdit;
  export let onRemove;
  export let onUp;
  export let onDown;
</script>

<div class="row">
  <div class="name">{column.columnName}</div>
  <div class="nowrap">
    <span class="icon" on:click={onEdit}>
      <FontIcon icon="icon edit" />
    </span>
    <span class="icon" on:click={onRemove}>
      <FontIcon icon="icon delete" />
    </span>
    <span class="icon" on:click={onUp}>
      <FontIcon icon="icon arrow-up" />
    </span>
    <span class="icon" on:click={onDown}>
      <FontIcon icon="icon arrow-down" />
    </span>
  </div>
</div>

<style>
  .row {
    display: flex;
    justify-content: space-between;
    cursor: pointer;
  }
  .row:hover {
    background-color: var(--theme-bg-selected);
  }
  .name {
    white-space: nowrap;
    margin: 5px;
  }
  .icon {
    position: relative;
    top: 5px;
    padding: 5px;
  }
  .icon:hover {
    background-color: var(--theme-bg-3);
  }
</style>
