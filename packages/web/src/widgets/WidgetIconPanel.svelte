<script lang="ts">
  import { onMount } from 'svelte';
  import FontIcon from '../icons/FontIcon.svelte';
  import { currentDropDownMenu, selectedWidget, visibleCommandPalette } from '../stores';
  import { shouldDrawTitleBar } from '../utility/common';
  import mainMenuDefinition from '../../../../app/src/mainMenuDefinition';

  let domSettings;
  let domMainMenu;

  const widgets = [
    {
      icon: 'icon database',
      name: 'database',
      title: 'Database connections',
    },
    // {
    //   icon: 'fa-table',
    //   name: 'table',
    // },
    {
      icon: 'icon file',
      name: 'file',
      title: 'Favorites & Saved files',
    },
    {
      icon: 'icon history',
      name: 'history',
      title: 'Query history & Closed tabs',
    },
    {
      icon: 'icon archive',
      name: 'archive',
      title: 'Archive (saved tabular data)',
    },
    {
      icon: 'icon plugin',
      name: 'plugins',
      title: 'Extensions & Plugins',
    },
    {
      icon: 'icon cell-data',
      name: 'cell-data',
      title: 'Selected cell data detail view',
    },
    {
      icon: 'icon app',
      name: 'app',
      title: 'Application layers',
    },
    // {
    //   icon: 'icon settings',
    //   name: 'settings',
    // },
    // {
    //   icon: 'fa-check',
    //   name: 'settings',
    // },
  ];

  function handleChangeWidget(name) {
    $selectedWidget = name == $selectedWidget ? null : name;
  }
  //const handleChangeWidget= e => (selectedWidget.set(item.name))

  function handleSettingsMenu() {
    const rect = domSettings.getBoundingClientRect();
    const left = rect.right;
    const top = rect.bottom;
    const items = [{ command: 'settings.commands' }, { command: 'theme.changeTheme' }, { command: 'settings.show' }];
    currentDropDownMenu.set({ left, top, items });
  }

  function handleMainMenu() {
    const rect = domMainMenu.getBoundingClientRect();
    const left = rect.right;
    const top = rect.top;
    console.log('mainMenuDefinition', mainMenuDefinition);
    const items = mainMenuDefinition;
    currentDropDownMenu.set({ left, top, items });
  }

  let showMainMenu = false;
  onMount(async () => {
    showMainMenu = !(await shouldDrawTitleBar());
  });
</script>

<div class="main">
  {#if showMainMenu}
    <div class="wrapper mb-3" on:click={handleMainMenu} bind:this={domMainMenu}>
      <FontIcon icon="icon menu" />
    </div>
  {/if}
  {#each widgets as item}
    <div class="wrapper" class:selected={item.name == $selectedWidget} on:click={() => handleChangeWidget(item.name)}>
      <FontIcon icon={item.icon} title={item.title} />
    </div>
  {/each}

  <div class="flex1">&nbsp;</div>

  <div class="wrapper" on:click={handleSettingsMenu} bind:this={domSettings}>
    <FontIcon icon="icon settings" />
  </div>
</div>

<style>
  .wrapper {
    font-size: 23pt;
    height: 60px;
    display: flex;
    align-items: center;
    justify-content: center;
    color: var(--theme-font-inv-2);
  }
  .wrapper:hover {
    color: var(--theme-font-inv-1);
  }
  .wrapper.selected {
    color: var(--theme-font-inv-1);
    background: var(--theme-bg-inv-3);
  }
  .main {
    display: flex;
    flex: 1;
    flex-direction: column;
  }
</style>
