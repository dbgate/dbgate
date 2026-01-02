<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import FontIcon from '../icons/FontIcon.svelte';

  export let disabled = false;
  export let icon = null;
  export let title = null;
  export let splitIcon = 'icon chevron-down';

  const dispatch = createEventDispatcher();

  function handleClick(e) {
    if (disabled) return;
    dispatch('click', { target: e.target });
  }
  function handleSplitClick(e) {
    if (disabled) return;
    dispatch('splitclick', { target: e.target });
  }
</script>

<div class="button" class:disabled {title}>
  <div class="inner" class:disabled>
    <div class="main" class:disabled on:click={handleClick} data-testid={$$props['data-testid']}>
      <span class="icon" class:disabled><FontIcon {icon} /></span>
      <slot />
    </div>
    <span class="split-icon" class:disabled on:click={handleSplitClick}><FontIcon icon={splitIcon} /></span>
  </div>
</div>

<style>
  .button {
    padding-left: 3px;
    padding-right: 3px;
    color: var(--theme-toolstrip-button-foreground);
    border: 0;
    align-self: stretch;
    display: flex;
    user-select: none;
    margin: 1px;
  }
  .button.disabled {
    color: var(--theme-toolstrip-button-foreground-disabled);
    opacity: 0.6;
  }
  .main {
    background: var(--theme-toolstrip-button-background);
    border: var(--theme-toolstrip-button-border);
    padding: 3px 6px 3px 8px;
    border-radius: 4px 0px 0px 4px;
    border-right: none;
    display: flex;
    align-items: center;
    font-size: 13px;
    font-weight: 500;
    transition: all 0.15s ease;
  }
  .main:hover:not(.disabled) {
    background: var(--theme-toolstrip-button-background-hover);
    border: var(--theme-toolstrip-button-border-hover);
    border-right: none;
    box-shadow: -1px 1px 3px rgba(0, 0, 0, 0.08);
  }
  .main:active:hover:not(.disabled) {
    background: var(--theme-toolstrip-button-background-active);
    box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05) inset;
    transform: translateY(1px);
  }
  .split-icon:hover:not(.disabled) {
    background: var(--theme-toolstrip-button-background-hover);
    box-shadow: 1px 1px 3px rgba(0, 0, 0, 0.08);
  }
  .split-icon:active:hover:not(.disabled) {
    background: var(--theme-toolstrip-button-background-active);
    box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05) inset;
    transform: translateY(1px);
  }
  .split-icon {
    background: var(--theme-toolstrip-button-background);
    padding: 3px 6px;
    border-radius: 0px 4px 4px 0px;
    border: var(--theme-toolstrip-button-border);
    border-left: var(--theme-toolstrip-button-split-separator-border);
    transition: all 0.15s ease;
    color: var(--theme-toolstrip-button-foreground-icon);
    cursor: pointer;
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
    cursor: pointer;
    display: flex;
  }
</style>
