<script lang="ts">
  import { currentDropDownMenu } from '../stores';
  import FontIcon from '../icons/FontIcon.svelte';

  export let value;
  export let menu = [];
  export let asyncMenu = undefined;
  export let disabled = false;
  export let outline = false;
  export let skipWidth = false;
  export let icon = 'icon chevron-down';

  let domButton;
  let isLoading = false;

  async function handleClick() {
    if (disabled) return;

    let items = menu;

    if (asyncMenu) {
      isLoading = true;
      items = await asyncMenu();
      isLoading = false;
    }

    const rect = domButton.getBoundingClientRect();
    const left = rect.left;
    const top = rect.bottom;
    currentDropDownMenu.set({ left, top, items });
  }
</script>

<div on:click={handleClick} class:disabled class:outline class:skipWidth bind:this={domButton}>
  {value}
  <FontIcon icon={isLoading ? 'icon loading' : icon} padLeft />
</div>

<style>
  div {
    border: var(--theme-formbutton-border);
    padding: 2px;
    padding-bottom: 4px;
    margin: 2px;
    background: var(--theme-formbutton-background);
    color: var(--theme-formbutton-foreground);
    border-radius: 2px;
    display: inline-block;
    cursor: pointer;
  }

  div:not(.skipWidth) {
    width: 100px;
  }

  div:hover:not(.disabled):not(.outline) {
    background: var(--theme-formbutton-background-hover);
  }
  div:active:not(.disabled):not(.outline) {
    background: var(--theme-formbutton-background-active);
  }
  div.disabled {
    background: var(--theme-formbutton-background-disabled);
    color: var(--theme-formbutton-foreground-disabled);
  }

  div.outline {
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
