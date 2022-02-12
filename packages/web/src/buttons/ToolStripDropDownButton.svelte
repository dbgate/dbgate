<script lang="ts">
  import { currentDropDownMenu } from '../stores';

  import ToolStripButton from './ToolStripButton.svelte';

  export let menu;
  export let title;
  export let label;
  export let icon;
  export let component = ToolStripButton;

  function handleClick(e) {
    const rect = e.target.getBoundingClientRect();
    const left = rect.left;
    const top = rect.bottom;
    currentDropDownMenu.set({ left, top, items: menu });
  }
</script>

<svelte:component this={component} {title} {icon} on:click={handleClick}>
  {label}
</svelte:component>
