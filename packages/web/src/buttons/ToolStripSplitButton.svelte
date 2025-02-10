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
  .main {
    background: var(--theme-bg-2);
    padding: 3px 0px 3px 8px;
    border-radius: 4px 0px 0px 4px;
  }
  .main:hover:not(.disabled) {
    background: var(--theme-bg-3);
  }
  .main:active:hover:not(.disabled) {
    background: var(--theme-bg-4);
  }
  .split-icon:hover:not(.disabled) {
    background: var(--theme-bg-3);
  }
  .split-icon:active:hover:not(.disabled) {
    background: var(--theme-bg-4);
  }
  .split-icon {
    background: var(--theme-bg-2);
    padding: 3px 8px 3px 0px;
    border-radius: 0px 4px 4px 0px;
  }
  .icon {
    margin-right: 5px;
    color: var(--theme-font-link);
  }
  .icon.disabled {
    color: var(--theme-font-3);
  }
  .inner {
    white-space: nowrap;
    align-self: center;
    cursor: pointer;
    display: flex;
  }
  .main {
    display: flex;
    padding-right: 5px;
  }
  .split-icon {
    padding-left: 5px;
    color: var(--theme-font-link);
    border-left: 1px solid var(--theme-bg-4);
  }
</style>
