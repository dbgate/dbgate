<script lang="ts">
  import ShowFormButton from '../formview/ShowFormButton.svelte';
  import FontIcon from '../icons/FontIcon.svelte';

  export let rowIndex;
  export let onShowForm;

  export let extraIcon = null;
  export let extraIconTooltip = null;
  export let isSelected = false;

  let mouseIn = false;
</script>

<td
  data-row={rowIndex}
  data-col="header"
  class:selected={isSelected}
  on:mouseenter={() => (mouseIn = true)}
  on:mouseleave={() => (mouseIn = false)}
>
  {rowIndex + 1}

  {#if mouseIn && onShowForm}
    <ShowFormButton on:click={onShowForm} />
  {/if}
  {#if extraIcon}
    <div class="extraIcon" title={extraIconTooltip}>
      <FontIcon icon={extraIcon} />
    </div>
  {/if}
</td>

<style>
  td {
    border-top: var(--theme-datagrid-border-horizontal);
    border-bottom: var(--theme-datagrid-border-horizontal);
    border-left: var(--theme-datagrid-border-vertical);
    border-right: var(--theme-datagrid-border-vertical);
    text-align: left;
    padding: 2px;
    background-color: var(--theme-datagrid-headercell-background);
    overflow: hidden;
    position: relative;
  }
  .extraIcon {
    position: absolute;
    right: 0px;
    top: 1px;
  }
  :global(.data-grid-focused) td.selected {
    background-color: var(--theme-datagrid-focused-cell-background);
  }
</style>
