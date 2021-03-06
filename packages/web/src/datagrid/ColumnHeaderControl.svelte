<script lang="ts">
  import FontIcon from '../icons/FontIcon.svelte';
  import DropDownButton from '../elements/DropDownButton.svelte';

  import ColumnLabel from './ColumnLabel.svelte';

  export let column;
  export let conid = undefined;
  export let database = undefined;
  export let grouping = undefined;
  export let order = undefined;
</script>

<div class="header">
  <div class="label">
    {#if grouping}
      <span class="grouping">
        {grouping == 'COUNT DISTINCT' ? 'distinct' : grouping.toLowerCase()}
      </span>
    {/if}
    <ColumnLabel {...column} />
  </div>
  {#if order == 'ASC'}
    <span class="icon">
      <FontIcon icon="img sort-asc" />
    </span>
  {/if}
  {#if order == 'DESC'}
    <span class="icon">
      <FontIcon icon="img sort-desc" />
    </span>
  {/if}
  <DropDownButton />
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
