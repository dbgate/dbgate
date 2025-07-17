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
    border: 1px solid var(--theme-bg-button-inv-2);
    padding: 2px;
    padding-bottom: 4px;
    margin: 2px;
    background-color: var(--theme-bg-button-inv);
    color: var(--theme-font-inv-1);
    border-radius: 2px;
    display: inline-block;
    cursor: pointer;
  }

  div:not(.skipWidth) {
    width: 100px;
  }

  div:hover:not(.disabled):not(.outline) {
    background-color: var(--theme-bg-button-inv-2);
  }
  div:active:not(.disabled):not(.outline) {
    background-color: var(--theme-bg-button-inv-3);
  }
  div.disabled {
    background-color: var(--theme-bg-button-inv-3);
    color: var(--theme-font-inv-3);
  }

  div.outline {
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
