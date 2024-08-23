<script lang="ts">
  import FontIcon from '../icons/FontIcon.svelte';
  import { currentDropDownMenu } from '../stores';

  export let icon = 'icon form';
  export let menu;

  let domButton;

  function handleClick() {
    const rect = domButton.getBoundingClientRect();
    const left = rect.left;
    const top = rect.bottom;
    currentDropDownMenu.set({ left, top, items: menu });
  }
</script>

<div
  on:click|stopPropagation|preventDefault={handleClick}
  bind:this={domButton}
  on:mousedown|stopPropagation|preventDefault
  on:mouseup|stopPropagation|preventDefault
  class="showFormButtonMarker"
>
  <FontIcon {icon} />
</div>

<style>
  div {
    position: absolute;
    right: 0px;
    top: 1px;
    color: var(--theme-font-3);
    background-color: var(--theme-bg-1);
    border: 1px solid var(--theme-bg-1);
  }

  div:hover {
    color: var(--theme-font-hover);
    border: var(--theme-border);
    top: 1px;
    right: 0px;
  }
</style>
