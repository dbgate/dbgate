<script context="module">
  function getCommandTitle(command) {
    let res = command.text;
    if (command.keyText || command.keyTextFromGroup) {
      res += ` (${formatKeyText(command.keyText || command.keyTextFromGroup)})`;
    }
    return res;
  }
</script>

<script>
  import _ from 'lodash';
  import { openFavorite } from '../appobj/FavoriteFileAppObject.svelte';
  import runCommand from '../commands/runCommand';
  import FontIcon from '../icons/FontIcon.svelte';
  import { activeTab, commands, commandsCustomized } from '../stores';
  import getElectron from '../utility/getElectron';
  import { useFavorites } from '../utility/metadataLoaders';
  import ToolbarButton from '../buttons/ToolbarButton.svelte';
  import { formatKeyText } from '../utility/common';

  const electron = getElectron();

  $: favorites = useFavorites();

  $: list = _.sortBy(
    Object.values($commandsCustomized).filter(x => (x.enabled || x.showDisabled) && x.toolbar && x.onClick),
    x => (x.toolbarOrder == null ? 100 : x.toolbarOrder)
  );
</script>

<div class="root">
  <div class="container">
    {#if !electron}
      <ToolbarButton externalImage="logo192.png" on:click={() => runCommand('about.show')} />
    {/if}
    {#each ($favorites || []).filter(x => x.showInToolbar) as item}
      <ToolbarButton on:click={() => openFavorite(item)} icon={item.icon || 'icon favorite'}>
        {item.title}
      </ToolbarButton>
    {/each}

    {#each list.filter(x => !x.isRelatedToTab) as command}
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
  <div class="container">
    {#if $activeTab && list.filter(x => x.isRelatedToTab).length > 0}
      <div class="activeTab">
        <div class="activeTabInner">
          <FontIcon icon={$activeTab.icon} />
          {$activeTab.title}:
        </div>
      </div>
    {/if}
    {#each list.filter(x => x.isRelatedToTab) as command}
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
</div>

<style>
  .container {
    display: flex;
    user-select: none;
    align-items: stretch;
    height: var(--dim-toolbar-height);
  }
  .root {
    display: flex;
    align-items: stretch;
    justify-content: space-between;
  }

  .activeTab {
    background-color: var(--theme-bg-2);
    white-space: nowrap;
    display: flex;
    padding-left: 15px;
    padding-right: 15px;
  }

  .activeTabInner {
    align-self: center;
  }
</style>
