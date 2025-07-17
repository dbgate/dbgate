<script lang="ts">
  import FontIcon from "../icons/FontIcon.svelte";

  export let onClose;
</script>

<div class="chip">
  <slot />
  {#if onClose}
    <span class="close" on:click={onClose}><FontIcon icon="icon close" /></span>
  {/if}
</div>

<style>
  .chip {
    display: inline-block;
    padding: 0.25em 0.5em;
    border-radius: 1em;
    background-color: var(--theme-bg-2);
    color: var(--theme-font-1);
    font-size: 0.875em;
    cursor: pointer;
    margin: 2px;
  }
  .chip .close {
    margin-left: 0.2em;
    color: var(--theme-font-2);
    cursor: pointer;
  }
  .chip .close:hover {
    color: var(--theme-font-hover);
  }
</style>
