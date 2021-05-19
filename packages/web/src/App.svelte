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

  let loaded = false;

  async function loadSettings() {
    try {
      const settings = await axiosInstance.get('config/get-settings');
      const connections = await axiosInstance.get('connections/list');
      const config = await axiosInstance.get('config/get');
      loaded = settings?.data && connections?.data && config?.data;
      if (loaded) {
        setAppLoaded();
      } else {
        console.log('API not initialized correctly, trying again in 1s');
        setTimeout(loadSettings, 1000);
      }
    } catch (err) {
      console.log('Error calling API, trying again in 1s');
      setTimeout(loadSettings, 1000);
    }
  }

  onMount(loadSettings);

</script>

<DataGridRowHeightMeter />
<ErrorHandler />
<CommandListener />

{#if loaded}
  <PluginsProvider />
  {#if $loadingPluginStore?.loaded}
    <OpenTabsOnStartup />
    <Screen />
  {:else}
    <LoadingInfo message={`Loading plugin ${$loadingPluginStore.loadingPackageName}`} wrapper />
  {/if}
{:else}
  <LoadingInfo message="Starting DbGate ..." wrapper />
{/if}
