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
    padding-left: 3px;
    padding-right: 3px;
    color: var(--theme-toolstrip-button-foreground);
    align-self: stretch;
    display: flex;
    user-select: none;
    margin: 1px;
  }
  .button.disabled {
    color: var(--theme-toolstrip-button-foreground-disabled);
    opacity: 0.6;
  }
  .inner:hover:not(.disabled) {
    background: var(--theme-toolstrip-button-background-hover);
    border: var(--theme-toolstrip-button-border-hover);
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08);
  }
  .inner:active:hover:not(.disabled) {
    background: var(--theme-toolstrip-button-background-active);
    box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05) inset;
    transform: translateY(1px);
  }
  .icon {
    margin-right: 5px;
    color: var(--theme-toolstrip-button-foreground-icon);
    transition: color 0.15s ease;
  }
  .icon.disabled {
    color: var(--theme-toolstrip-button-foreground-disabled);
  }
  .inner {
    white-space: nowrap;
    align-self: center;
    background: var(--theme-toolstrip-button-background);
    padding: 3px 8px;
    border-radius: 4px;
    border: var(--theme-toolstrip-button-border);
    cursor: pointer;
    transition: all 0.15s ease;
    display: flex;
    align-items: center;
    font-size: 13px;
    font-weight: 500;
  }
  .inner.disabled {
    border: var(--theme-toolstrip-button-border-disabled);
    cursor: not-allowed;
  }
</style>
