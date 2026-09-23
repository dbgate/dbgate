<script lang="ts">
  import { onMount } from 'svelte';

  import CommandListener from './commands/CommandListener.svelte';
  import DataGridRowHeightMeter from './datagrid/DataGridRowHeightMeter.svelte';
  import LoadingInfo from './elements/LoadingInfo.svelte';

  import PluginsProvider from './plugins/PluginsProvider.svelte';
  import Screen from './Screen.svelte';
  import { loadingPluginStore, subscribeApiDependendStores } from './stores';
  import { setAppLoaded } from './utility/appLoadManager';
  import ErrorHandler from './utility/ErrorHandler.svelte';
  import OpenTabsOnStartup from './utility/OpenTabsOnStartup.svelte';
  // import { shouldWaitForElectronInitialize } from './utility/getElectron';
  import { subscribeConnectionPingers } from './utility/connectionsPinger';
  import { subscribePermissionCompiler } from './utility/hasPermission';
  import {
    apiCall,
    installNewCloudTokenListener,
    installNewVolatileConnectionListener,
    refreshPublicCloudFiles,
  } from './utility/api';
  import { getAllApps, getConfig, getSettings, useConfig, useSettings } from './utility/metadataLoaders';
  import AppTitleProvider from './utility/AppTitleProvider.svelte';
  import getElectron from './utility/getElectron';
  import AppStartInfo from './widgets/AppStartInfo.svelte';
  import SettingsListener from './utility/SettingsListener.svelte';
  import { handleAuthOnStartup } from './clientAuth';
  import { initializeAppUpdates } from './utility/appUpdate';
  import { _t, getCurrentTranslations, saveSelectedLanguageToCache } from './translations';
  import { installCloudListeners } from './utility/cloudListeners';
  import { showModal } from './modals/modalTools';
  import UsageAnalyticsConsentModal from './modals/UsageAnalyticsConsentModal.svelte';
  import {
    getUsageAnalyticsConsent,
    flushUsageAnalytics,
    setUsageAnalyticsConsent,
    trackUsage,
  } from './utility/usageAnalytics';

  export let isAdminPage = false;

  let loadedApi = false;
  let loadedPlugins = false;
  let usageAnalyticsStartupHandled = false;
  const analyticsSettings = useSettings();
  const analyticsConfig = useConfig();

  $: if (
    loadedApi &&
    ($analyticsConfig?.usageAnalyticsConsentOverride === false ||
      $analyticsSettings?.['storage.usageAnalytics'] === 'disabled')
  ) {
    if (getUsageAnalyticsConsent() === false) flushUsageAnalytics();
  }

  function handleUsageAnalyticsConsent(consent: boolean) {
    setUsageAnalyticsConsent(consent);
    refreshPublicCloudFiles();
    if (consent) trackUsage({ feature: 'application', action: 'start' });
  }

  async function loadApi() {
    // if (shouldWaitForElectronInitialize()) {
    //   setTimeout(loadApi, 100);
    //   return;
    // }

    try {
      // console.log('************** LOADING API');

      const config = await getConfig();
      await handleAuthOnStartup(config);

      const connections = await apiCall('connections/list');
      const settings = await getSettings();
      const apps = await getAllApps();
      const loadedApiValue = !!(settings && connections && config && apps);

      if (loadedApiValue) {
        subscribeApiDependendStores();
        subscribeConnectionPingers();
        subscribePermissionCompiler();
        installNewVolatileConnectionListener();
        installNewCloudTokenListener();
        initializeAppUpdates();
        installCloudListeners();
        saveSelectedLanguageToCache(config.preferrendLanguage);

        const electron = getElectron();
        if (electron) {
          electron.send('translation-data', JSON.stringify(getCurrentTranslations()));
          global.TRANSLATION_DATA = getCurrentTranslations();
        }
      }

      loadedApi = loadedApiValue;

      if (!loadedApi) {
        console.log('API not initialized correctly, trying again in 1s');
        setTimeout(loadApi, 1000);
      }
    } catch (err) {
      console.log('Error calling API, trying again in 1s');
      setTimeout(loadApi, 1000);
    }
  }

  onMount(loadApi);

  onMount(() => {
    const removed = document.getElementById('starting_dbgate_zero');
    if (removed) removed.remove();
  });

  $: {
    if (loadedApi && $loadingPluginStore?.loaded) {
      setAppLoaded();
      loadedPlugins = true;
      getElectron()?.send('app-started');
    }
  }

  $: if (loadedPlugins && !usageAnalyticsStartupHandled) {
    usageAnalyticsStartupHandled = true;
    const consent = getUsageAnalyticsConsent();
    if (consent === null) {
      showModal(UsageAnalyticsConsentModal, { onConsent: handleUsageAnalyticsConsent });
    } else {
      refreshPublicCloudFiles();
      if (consent) trackUsage({ feature: 'application', action: 'start' });
    }
  }
</script>

<ErrorHandler />

{#if loadedApi}
  <DataGridRowHeightMeter />
  <CommandListener />
  <PluginsProvider />
  <AppTitleProvider />
  {#if loadedPlugins}
    <OpenTabsOnStartup />
    <SettingsListener />
    <Screen />
  {:else}
    <AppStartInfo
      message={$loadingPluginStore.loadingPackageName
        ? _t('app.loading_plugin', {
            defaultMessage: `Loading plugin {plugin} ...`,
            values: { plugin: $loadingPluginStore.loadingPackageName },
          })
        : _t('app.preparingPlugins', { defaultMessage: 'Preparing plugins ...' })}
    />
  {/if}
{:else}
  <AppStartInfo message={_t('app.starting', { defaultMessage: 'Starting DbGate' })} />
{/if}
