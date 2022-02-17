<script lang="ts">
  import { currentDropDownMenu } from '../stores';

  import ToolStripButton from './ToolStripButton.svelte';
  import ToolStripSplitButton from './ToolStripSplitButton.svelte';

  export let menu;
  export let title = undefined;
  export let label;
  export let icon;
  export let component = ToolStripButton;

  function handleClick(e) {
    const rect = e.detail.target.getBoundingClientRect();
    const left = rect.left;
    const top = rect.bottom;
    currentDropDownMenu.set({ left, top, items: menu });
  }
</script>

<ToolStripSplitButton {title} {icon} on:splitclick={handleClick} on:click>
  <slot />
</ToolStripSplitButton>
