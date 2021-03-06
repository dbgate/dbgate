<script context="module">
  function getCommandTitle(command) {
    let res = command.text;
    if (command.keyText) res += ` (${command.keyText})`;
    return res;
  }
</script>

<script>
  import _ from 'lodash';
  import App from '../App.svelte';
  import { commands } from '../stores';
  import ToolbarButton from './ToolbarButton.svelte';

  $: list = _.sortBy(
    Object.values($commands).filter(x => (x.enabled || x.showDisabled) && x.toolbar && x.onClick),
    x => (x.toolbarOrder == null ? 100 : x.toolbarOrder)
  );
</script>

<div class="container">
  {#each list as command}
    <ToolbarButton
      icon={command.icon}
      on:click={command.onClick}
      disabled={!command.enabled}
      title={getCommandTitle(command)}
    >
      {command.toolbarName || command.name}
    </ToolbarButton>
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
