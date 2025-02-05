<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import FontIcon from '../icons/FontIcon.svelte';

  export let disabled = false;
  export let icon = null;
  export let title = null;
  export let iconAfter = null;

  const dispatch = createEventDispatcher();

  function handleClick(e) {
    if (disabled) return;
    dispatch('click', { target: e.target });
  }
</script>

<div class="button" class:disabled {title}>
  <div class="inner" class:disabled on:click={handleClick} data-testid={$$props['data-testid']}>
    <span class="icon" class:disabled><FontIcon {icon} /></span>
    <slot />
    {#if iconAfter}
      <span class="icon" class:disabled><FontIcon icon={iconAfter} /></span>
    {/if}
  </div>
</div>

<style>
  .button {
    /* padding: 5px 15px; */
    padding-left: 5px;
    padding-right: 5px;
    color: var(--theme-font-1);
    border: 0;
    align-self: stretch;
    display: flex;
    user-select: none;
    margin: 2px 0px;
  }
  .button.disabled {
    color: var(--theme-font-3);
  }
  .inner:hover:not(.disabled) {
    background: var(--theme-bg-3);
  }
  .inner:active:hover:not(.disabled) {
    background: var(--theme-bg-4);
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
    background: var(--theme-bg-2);
    padding: 3px 8px;
    border-radius: 4px;
    cursor: pointer;
  }
</style>
