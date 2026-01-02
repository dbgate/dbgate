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
    cloudSigninTokenHolder,
    seenPremiumPromoWidget,
    promoWidgetPreview,
  } from '../stores';
  import mainMenuDefinition from '../../../../app/src/mainMenuDefinition';
  import hasPermission from '../utility/hasPermission';
  import { isProApp } from '../utility/proTools';
  import { openWebLink } from '../utility/simpleTools';
  import { apiCall } from '../utility/api';
  import getElectron from '../utility/getElectron';
  import { showModal } from '../modals/modalTools';
  import NewObjectModal from '../modals/NewObjectModal.svelte';
  import openNewTab from '../utility/openNewTab';
  import { useConfig, usePromoWidget } from '../utility/metadataLoaders';
  import { _t, getCurrentTranslations } from '../translations';

  let domSettings;
  let domCloudAccount;
  let domMainMenu;

  const promoWidget = usePromoWidget({});

  const widgets = [
    getCurrentConfig().storageDatabase && {
      icon: 'icon admin',
      name: 'admin',
      title: _t('widgets.administration', { defaultMessage: 'Administration' }),
    },
    {
      icon: 'icon database',
      name: 'database',
      title: _t('widgets.databaseConnections', { defaultMessage: 'Database connections' }),
    },
    getCurrentConfig().allowPrivateCloud && {
      name: 'cloud-private',
      title: _t('widgets.dbgateCloud', { defaultMessage: 'DbGate Cloud' }),
      icon: 'icon cloud-private',
    },

    // {
    //   icon: 'fa-table',
    //   name: 'table',
    // },
    {
      icon: 'icon file',
      name: 'file',
      title: _t('widgets.favoritesAndSavedFiles', { defaultMessage: 'Favorites & Saved files' }),
    },
    {
      icon: 'icon history',
      name: 'history',
      title: _t('widgets.queryHistoryAndClosedTabs', { defaultMessage: 'Query history & Closed tabs' }),
    },
    isProApp() && {
      icon: 'icon archive',
      name: 'archive',
      title: _t('widgets.archive', { defaultMessage: 'Archive (saved tabular data)' }),
    },
    // {
    //   icon: 'icon plugin',
    //   name: 'plugins',
    //   title: 'Extensions & Plugins',
    // },
    {
      name: 'cloud-public',
      title: _t('widgets.dbgateCloud', { defaultMessage: 'DbGate Cloud' }),
      icon: 'icon cloud-public',
    },
    {
      icon: 'icon premium',
      name: 'premium',
      title: _t('widgets.premiumPromo', { defaultMessage: 'Premium promo' }),
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

      if (name == 'premium') {
        $seenPremiumPromoWidget = $promoWidget?.identifier || '';
      }
    }
  }
  //const handleChangeWidget= e => (selectedWidget.set(item.name))

  function handleSettingsMenu() {
    openNewTab({
      title: 'Settings',
      icon: 'icon settings',
      tabComponent: 'SettingsTab',
      props: {},
    });
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
    const items = mainMenuDefinition({ editMenu: false }, getCurrentTranslations());
    currentDropDownMenu.set({ left, top, items });
  }

  async function handleOpenCloudLogin() {
    const useRedirect = getCurrentConfig()?.redirectToDbGateCloudLogin;
    const { url, sid } = await apiCall('auth/create-cloud-login-session', {
      client: getElectron() ? 'app' : 'web',
      redirectUri: useRedirect ? location.origin + location.pathname : undefined,
    });
    if (useRedirect) {
      location.href = url;
    } else {
      openWebLink(url, true);
    }
  }

  $: promoWidgetData = $promoWidgetPreview || $promoWidget;
  $: config = useConfig();
</script>

<div class="main">
  {#if $visibleHamburgerMenuWidget}
    <div class="wrapper mb-3" on:click={handleMainMenu} bind:this={domMainMenu} data-testid="WidgetIconPanel_menu">
      <FontIcon icon="icon menu" />
    </div>
  {/if}
  {#each widgets
    .filter(x => x && hasPermission(`widgets/${x.name}`))
    .filter(x => !x.isPremiumPromo || (($config?.trialDaysLeft != null || !isProApp()) && promoWidgetData?.state == 'data'))
    // .filter(x => !x.isPremiumOnly || isProApp())
    .filter(x => x.name != 'cloud-private' || $cloudSigninTokenHolder) as item}
    <div
      class="wrapper"
      class:selected={item.name == $visibleSelectedWidget}
      data-testid={`WidgetIconPanel_${item.name}`}
      on:click={() => handleChangeWidget(item.name)}
    >
      {#if item.isPremiumPromo && promoWidgetData?.isColoredIcon}
        <FontIcon
          icon={item.icon}
          title={item.title}
          colorClass="premium-background-gradient widget-icon-panel-rounded"
        />
      {:else}
        <FontIcon icon={item.icon} title={item.title} />
      {/if}
      {#if item.isPremiumPromo}
        <div class="premium-promo">Premium</div>
        {#if promoWidgetData?.identifier != $seenPremiumPromoWidget}
          <div class="premium-promo-not-seen">•</div>
        {/if}
      {/if}
    </div>
  {/each}

  <div
    class="wrapper"
    on:click={() => showModal(NewObjectModal)}
    data-testid="WidgetIconPanel_addButton"
    title={_t('widgets.addNew', { defaultMessage: 'Add New' })}
  >
    <FontIcon icon="icon add" />
  </div>

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

  {#if getCurrentConfig().allowPrivateCloud}
    {#if $cloudSigninTokenHolder}
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
  {/if}

  <div class="wrapper" on:click={handleSettingsMenu} bind:this={domSettings} data-testid="WidgetIconPanel_settings">
    <FontIcon icon="icon settings" />
  </div>
</div>

<style>
  .wrapper {
    font-size: 20pt;
    height: 50px;
    display: flex;
    align-items: center;
    justify-content: center;
    color: var(--theme-widget-panel-foreground);
    position: relative;
    transition: var(--theme-widget-icon-transition);
    cursor: pointer;
  }
  .wrapper:hover {
    color: var(--theme-widget-icon-active-foreground);
  }
  .wrapper.selected {
    color: var(--theme-widget-icon-active-foreground);
    background: var(--theme-widget-icon-active-background);
    border-left: 1px solid var(--theme-widget-icon-active-foreground);
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
    background: var(--theme-widget-panel-background);
    color: var(--theme-widget-panel-foreground);
    padding: 1px 3px;
    border-radius: 3px;
    bottom: 0;
  }

  .premium-promo-not-seen {
    position: absolute;
    font-size: 16pt;
    color: var(--theme-icon-yellow);
    top: -5px;
    right: 5px;
  }

  :global(.widget-icon-panel-rounded) {
    border-top-left-radius: 10px;
    border-top-right-radius: 10px;
  }
</style>
