<script lang="ts">
  import ShowFormButton from '../formview/ShowFormButton.svelte';
  import FontIcon from '../icons/FontIcon.svelte';

  export let rowIndex;
  export let onShowForm;

  export let extraIcon = null;
  export let extraIconTooltip = null;

  let mouseIn = false;
</script>

<td
  data-row={rowIndex}
  data-col="header"
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
    border: 1px solid var(--theme-border);
    text-align: left;
    padding: 2px;
    background-color: var(--theme-bg-1);
    overflow: hidden;
    position: relative;
  }
  .extraIcon {
    position: absolute;
    right: 0px;
    top: 1px;
  }
</style>
