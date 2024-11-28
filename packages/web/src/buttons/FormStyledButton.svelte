<script lang="ts">
  import { createEventDispatcher } from 'svelte';

  const dispatch = createEventDispatcher();

  export let type = 'button';
  export let disabled = false;
  export let value;
  export let title = null;
  export let skipWidth = false;
  export let outline = false;

  function handleClick() {
    if (!disabled) dispatch('click');
  }

  let domButton;

  export function getBoundingClientRect() {
    return domButton.getBoundingClientRect();
  }
</script>

<input
  {type}
  {value}
  {title}
  class:disabled
  {...$$restProps}
  on:click={handleClick}
  bind:this={domButton}
  class:skipWidth
  class:outline
/>

<style>
  input {
    border: 1px solid var(--theme-bg-button-inv-2);
    padding: 5px;
    margin: 2px;
    background-color: var(--theme-bg-button-inv);
    color: var(--theme-font-inv-1);
    border-radius: 2px;
  }

  input:not(.skipWidth) {
    width: 100px;
  }

  input:hover:not(.disabled):not(.outline) {
    background-color: var(--theme-bg-button-inv-2);
  }
  input:active:not(.disabled):not(.outline) {
    background-color: var(--theme-bg-button-inv-3);
  }
  input.disabled {
    background-color: var(--theme-bg-button-inv-3);
    color: var(--theme-font-inv-3);
  }

  input.outline {
    background-color: transparent;
    color: var(--theme-font-2);
    border: 1px solid var(--theme-bg-button-inv-2);
  }

  input.outline:hover:not(.disabled) {
    color: var(--theme-bg-button-inv-3);
    border: 2px solid var(--theme-bg-button-inv-3);
    margin: 1px;
  }

</style>
