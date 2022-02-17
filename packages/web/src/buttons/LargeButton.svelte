<script lang="ts">
  import FontIcon from '../icons/FontIcon.svelte';
  import { createEventDispatcher } from 'svelte';

  export let icon;
  export let disabled = false;
  export let fillHorizontal = false;

  const dispatch = createEventDispatcher();

  function handleClick() {
    if (!disabled) dispatch('click');
  }
</script>

<div class="button" on:click={handleClick} class:disabled class:fillHorizontal>
  <div class="icon">
    <FontIcon {icon} />
  </div>
  <div class="inner">
    <slot />
  </div>
</div>

<style>
  .button {
    padding: 5px 15px;
    color: var(--theme-font-1);
    border: 1px solid var(--theme-border);
    width: 120px;
    height: 60px;
    background-color: var(--theme-bg-1);
  }

  .button.fillHorizontal {
    width: auto;
    margin: 0px 10px;
  }

  .button:not(.disabled):hover {
    background-color: var(--theme-bg-2);
  }

  .button:not(.disabled):active {
    background-color: var(--theme-bg-3);
  }

  .button.disabled {
    color: var(--theme-font-3);
  }

  .icon {
    font-size: 30px;
    text-align: center;
  }

  .inner {
    text-align: center;
  }
</style>
