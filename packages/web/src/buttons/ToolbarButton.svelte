<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import FontIcon from '../icons/FontIcon.svelte';

  export let disabled = false;
  export let icon = null;
  export let title = null;
  export let externalImage = null;

  const dispatch = createEventDispatcher();

  function handleClick(e) {
    if (disabled) return;
    dispatch('click');
  }
</script>

<div class="button" on:click={handleClick} class:disabled {title}>
  <div class="inner">
    {#if externalImage}
      <img src={externalImage} />
    {:else}
      <span class="icon" class:disabled><FontIcon {icon} /></span>
      <slot />
    {/if}
  </div>
</div>

<style>
  .button {
    /* padding: 5px 15px; */
    padding-left: 15px;
    padding-right: 15px;
    color: var(--theme-font-1);
    border: 0;
    border-right: 1px solid var(--theme-border);
    align-self: stretch;
    display: flex;
    user-select: none;
  }
  .button.disabled {
    color: var(--theme-font-3);
  }
  .button:hover:not(.disabled) {
    background: var(--theme-bg-2);
  }
  .button:active:hover:not(.disabled) {
    background: var(--theme-bg-3);
  }
  .icon {
    margin-right: 5px;
    color: var(--theme-font-link);
  }
  .icon.disabled {
    color: var(--theme-font-3);
  }
  .inner {
    /* position: relative;
    top: 2px; */
    white-space: nowrap;
    align-self: center;
  }
  img {
    width: 20px;
    height: 20px;
  }
</style>
