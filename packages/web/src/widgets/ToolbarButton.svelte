<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import FontIcon from '../icons/FontIcon.svelte';

  export let disabled;
  export let icon;

  const dispatch = createEventDispatcher();

  function handleClick(e) {
    if (disabled) return;
    dispatch('click');
  }
</script>

<div class="button" on:click={handleClick} class:disabled>
  <div class="inner">
    <span class="icon" class:disabled><FontIcon {icon} /></span>
    <slot />
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
  }
  .button.disabled {
    color: var(--theme-font-3);
  }
  .button:hover {
    background: var(--theme-bg-2);
  }
  .button:active:hover {
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
</style>
