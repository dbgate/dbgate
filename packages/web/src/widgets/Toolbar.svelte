<script>
  import { filter } from 'lodash';
  import App from '../App.svelte';
  import { commands } from '../stores';
  import ToolbarButton from './ToolbarButton.svelte';
</script>

<div class="container">
  {#each Object.values($commands).filter(x => (x.enabled || x.showDisabled) && x.toolbar && x.onClick) as command}
    <ToolbarButton icon={command.icon} on:click={command.onClick} disabled={!command.enabled}
      >{command.name}</ToolbarButton
    >
  {/each}
</div>

<style>
  .container {
    display: flex;
    user-select: none;
    align-items: stretch;
    height: var(--dim-toolbar-height);
  }
</style>
