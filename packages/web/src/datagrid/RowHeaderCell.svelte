<script lang="ts">
  import ShowFormButton from '../formview/ShowFormButton.svelte';
  import FontIcon from '../icons/FontIcon.svelte';

  export let rowIndex;
  export let onShowForm;

  export let extraIcon = null;
  export let extraIconTooltip = null;
  export let isSelected = false;
  export let rowHeight = null;

  let mouseIn = false;

  $: fixedHeightContentStyle = rowHeight > 0 ? `height:${rowHeight}px; line-height:${rowHeight}px;` : undefined;
</script>

<td
  data-row={rowIndex}
  data-col="header"
  class:selected={isSelected}
  class:fixedHeight={rowHeight > 0}
  on:mouseenter={() => (mouseIn = true)}
  on:mouseleave={() => (mouseIn = false)}
>
  <div class="cellContent" class:fixedHeightContent={rowHeight > 0} style={fixedHeightContentStyle}>
    {rowIndex + 1}

    {#if mouseIn && onShowForm}
      <ShowFormButton on:click={onShowForm} />
    {/if}
    {#if extraIcon}
      <div class="extraIcon" title={extraIconTooltip}>
        <FontIcon icon={extraIcon} />
      </div>
    {/if}
  </div>
</td>

<style>
  td {
    border-top: var(--theme-datagrid-border-horizontal);
    border-bottom: var(--theme-datagrid-border-horizontal);
    border-right: var(--theme-datagrid-border-vertical);
    text-align: left;
    padding: 2px;
    background-color: var(--theme-datagrid-headercell-background);
    overflow: hidden;
    position: sticky;
    left: 0;
    z-index: 3;
  }
  td.fixedHeight {
    padding: 0;
  }
  .cellContent {
    display: contents;
  }
  .cellContent.fixedHeightContent {
    box-sizing: border-box;
    display: block;
    overflow: hidden;
    padding: 0 2px;
    position: relative;
    white-space: nowrap;
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
