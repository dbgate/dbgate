<script lang="ts">
  import { onMount } from 'svelte';
  import FontIcon from '../icons/FontIcon.svelte';
  import {
    currentDropDownMenu,
    selectedWidget,
    visibleSelectedWidget,
    visibleWidgetSideBar,
    visibleHamburgerMenuWidget,
    lockedDatabaseMode,
    getCurrentConfig,
    cloudSigninToken,
  } from '../stores';
  import mainMenuDefinition from '../../../../app/src/mainMenuDefinition';
  import hasPermission from '../utility/hasPermission';
  import { isProApp } from '../utility/proTools';
  import { openWebLink } from '../utility/simpleTools';
  import { apiCall } from '../utility/api';
  import getElectron from '../utility/getElectron';

  let domSettings;
  let domCloudAccount;
  let domMainMenu;

  const widgets = [
    getCurrentConfig().storageDatabase && {
      icon: 'icon admin',
      name: 'admin',
      title: 'Administration',
    },
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
      icon: 'icon cloud',
      name: 'cloud',
      title: 'DbGate Cloud',
      isCloud: true,
      iconSignedIn: 'icon cloud-logged',
      iconPublic: 'icon cloud-public',
    },
    {
      icon: 'icon premium',
      name: 'premium',
      title: 'Premium promo',
      isPremiumPromo: true,
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
    if ($visibleSelectedWidget == name) {
      $visibleWidgetSideBar = false;
    } else {
      $selectedWidget = name;
      $visibleWidgetSideBar = true;
    }
  }
  //const handleChangeWidget= e => (selectedWidget.set(item.name))

  function handleSettingsMenu() {
    const rect = domSettings.getBoundingClientRect();
    const left = rect.right;
    const top = rect.bottom;
    const items = [
      { command: 'settings.show' },
      { command: 'theme.changeTheme' },
      { command: 'settings.commands' },
      {
        text: 'View applications',
        onClick: () => {
          $selectedWidget = 'app';
          $visibleWidgetSideBar = true;
        },
      },
    ];
    currentDropDownMenu.set({ left, top, items });
  }

  function handleCloudAccountMenu() {
    const rect = domCloudAccount.getBoundingClientRect();
    const left = rect.right;
    const top = rect.bottom;
    const items = [{ command: 'cloud.logout' }];
    currentDropDownMenu.set({ left, top, items });
  }

  function handleMainMenu() {
    const rect = domMainMenu.getBoundingClientRect();
    const left = rect.right;
    const top = rect.top;
    const items = mainMenuDefinition({ editMenu: false });
    currentDropDownMenu.set({ left, top, items });
  }

  async function handleOpenCloudLogin() {
    const { url, sid } = await apiCall('auth/create-cloud-login-session', { client: getElectron() ? 'app' : 'web' });
    openWebLink(url, true);
  }
</script>

<div class="main">
  {#if $visibleHamburgerMenuWidget}
    <div class="wrapper mb-3" on:click={handleMainMenu} bind:this={domMainMenu} data-testid="WidgetIconPanel_menu">
      <FontIcon icon="icon menu" />
    </div>
  {/if}
  {#each widgets
    .filter(x => x && hasPermission(`widgets/${x.name}`))
    .filter(x => !x.isPremiumPromo || !isProApp())
    .map(x => (x.isCloud ? { ...x, icon: $cloudSigninToken ? x.iconSignedIn : x.iconPublic } : x)) as item}
    <div
      class="wrapper"
      class:selected={item.name == $visibleSelectedWidget}
      data-testid={`WidgetIconPanel_${item.name}`}
      on:click={() => handleChangeWidget(item.name)}
    >
      <FontIcon icon={item.icon} title={item.title} />
      {#if item.isPremiumPromo}
        <div class="premium-promo">Premium</div>
      {/if}
    </div>
  {/each}

  <div class="flex1">&nbsp;</div>

  <!-- <div
    class="wrapper"
    title={`Toggle whether tabs from all databases are visible. Currently - ${$lockedDatabaseMode ? 'NO' : 'YES'}`}
    on:click={() => {
      $lockedDatabaseMode = !$lockedDatabaseMode;
    }}
    data-testid="WidgetIconPanel_lockDb"
  >
    <FontIcon icon={$lockedDatabaseMode ? 'icon locked-database-mode' : 'icon unlocked-database-mode'} />
  </div> -->

  {#if $cloudSigninToken}
    <div
      class="wrapper"
      on:click={handleCloudAccountMenu}
      bind:this={domCloudAccount}
      data-testid="WidgetIconPanel_cloudAccount"
    >
      <FontIcon icon="icon cloud-account-connected" />
    </div>
  {:else}
    <div class="wrapper" on:click={handleOpenCloudLogin} data-testid="WidgetIconPanel_cloudAccount">
      <FontIcon icon="icon cloud-account" />
    </div>
  {/if}

  <div class="wrapper" on:click={handleSettingsMenu} bind:this={domSettings} data-testid="WidgetIconPanel_settings">
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
    position: relative;
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

  .premium-promo {
    position: absolute;
    text-transform: uppercase;
    font-size: 6pt;
    background: var(--theme-bg-inv-3);
    color: var(--theme-font-inv-2);
    padding: 1px 3px;
    border-radius: 3px;
    bottom: 0;
  }
</style>
