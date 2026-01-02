<script lang="ts">
  import { createEventDispatcher } from 'svelte';

  const dispatch = createEventDispatcher();

  export let type = 'button';
  export let disabled = false;
  export let value;
  export let title = null;
  export let skipWidth = false;
  export let outline = false;
  export let colorClass = '';

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
  class={colorClass}
  class:setBackgroundColor={!colorClass}
/>

<style>
  input {
    border: var(--theme-formbutton-border);
    padding: 5px;
    margin: 2px;
    color: var(--theme-formbutton-foreground);
    border-radius: 3px;
    cursor: pointer;
  }

  .setBackgroundColor {
    background: var(--theme-formbutton-background);
  }

  input:not(.skipWidth) {
    width: 100px;
  }

  input.setBackgroundColor:hover:not(.disabled):not(.outline) {
    background: var(--theme-formbutton-background-hover);
    border: var(--theme-formbutton-border-hover)
  }
  input.setBackgroundColor:active:not(.disabled):not(.outline) {
    background: var(--theme-formbutton-background-active);
    border: var(--theme-formbutton-border-active);
  }
  input.disabled {
    background: var(--theme-formbutton-background-disabled);
    color: var(--theme-formbutton-foreground-disabled);
    border: var(--theme-formbutton-border-disabled);
  }

  input.outline {
    background-color: transparent;
    color: var(--theme-outlinebutton-foreground);
    border: var(--theme-outlinebutton-border);
  }

  input.outline:hover:not(.disabled) {
    color: var(--theme-outlinebutton-hover-foreground);
    border: var(--theme-outlinebutton-hover-border);
    margin: 1px;
  }
</style>
