<script lang="ts">
  import FontIcon from '../icons/FontIcon.svelte';

  export let clickable = false;
  export let onClose = null;
</script>

<div on:click class:clickable {...$$restProps} class="wrapper">
  <slot />
  {#if onClose}
    <div class="close" on:click={onClose}>
      <FontIcon icon="icon close" />
    </div>
  {/if}
</div>

<style>
  .wrapper {
    padding: 5px;
    font-weight: bold;
    text-transform: uppercase;
    background-color: var(--theme-bg-1);
    border: 2px solid var(--theme-border);
    display: flex;
    align-items: center;
    justify-content: space-between;
  }
  .close {
    cursor: pointer;
  }
  .close:hover {
    color: var(--theme-font-hover);
  }
  div.clickable:hover {
    background-color: var(--theme-bg-2);
  }
</style>
