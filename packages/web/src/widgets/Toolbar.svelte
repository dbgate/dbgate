<script context="module">
  function getCommandTitle(command) {
    let res = command.text;
    if (command.keyText || command.keyTextFromGroup) res += ` (${command.keyText || command.keyTextFromGroup})`;
    return res;
  }
</script>

<script>
  import _ from 'lodash';
  import { openFavorite } from '../appobj/FavoriteFileAppObject.svelte';
  import runCommand from '../commands/runCommand';
  import { commands, commandsCustomized } from '../stores';
  import getElectron from '../utility/getElectron';
  import { useFavorites } from '../utility/metadataLoaders';
  import ToolbarButton from './ToolbarButton.svelte';

  const electron = getElectron();

  $: favorites = useFavorites();

  $: list = _.sortBy(
    Object.values($commandsCustomized).filter(x => (x.enabled || x.showDisabled) && x.toolbar && x.onClick),
    x => (x.toolbarOrder == null ? 100 : x.toolbarOrder)
  );
</script>

<div class="container">
  {#if !electron}
    <ToolbarButton externalImage="logo192.png" on:click={() => runCommand('about.show')} />
  {/if}
  {#each ($favorites || []).filter(x => x.showInToolbar) as item}
    <ToolbarButton on:click={() => openFavorite(item)} icon={item.icon || 'icon favorite'}>
      {item.title}
    </ToolbarButton>
  {/each}

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
