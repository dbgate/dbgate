<script lang="ts">
  import { onMount } from 'svelte';

  import CommandListener from './commands/CommandListener.svelte';
  import DataGridRowHeightMeter from './datagrid/DataGridRowHeightMeter.svelte';
  import LoadingInfo from './elements/LoadingInfo.svelte';

  import PluginsProvider from './plugins/PluginsProvider.svelte';
  import Screen from './Screen.svelte';
  import { loadingPluginStore } from './stores';
  import { setAppLoaded } from './utility/appLoadManager';
  import axiosInstance from './utility/axiosInstance';
  import ErrorHandler from './utility/ErrorHandler.svelte';
  import OpenTabsOnStartup from './utility/OpenTabsOnStartup.svelte';

  let loadedApi = false;

  async function loadApi() {
    try {
      const settings = await axiosInstance.get('config/get-settings');
      const connections = await axiosInstance.get('connections/list');
      const config = await axiosInstance.get('config/get');
      loadedApi = settings?.data && connections?.data && config?.data;
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
    }
  }

</script>

<DataGridRowHeightMeter />
<ErrorHandler />
<CommandListener />

{#if loadedApi}
  <PluginsProvider />
  {#if $loadingPluginStore?.loaded}
    <OpenTabsOnStartup />
    <Screen />
  {:else}
    <LoadingInfo
      message={$loadingPluginStore.loadingPackageName
        ? `Loading plugin ${$loadingPluginStore.loadingPackageName} ...`
        : 'Preparing plugins ...'}
      wrapper
    />
  {/if}
{:else}
  <LoadingInfo message="Starting DbGate ..." wrapper />
{/if}
