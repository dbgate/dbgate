<script lang="ts">
  import CommandListener from './commands/CommandListener.svelte';
  import DataGridRowHeightMeter from './datagrid/DataGridRowHeightMeter.svelte';
  import LoadingInfo from './elements/LoadingInfo.svelte';

  import PluginsProvider from './plugins/PluginsProvider.svelte';
  import Screen from './Screen.svelte';
  import ErrorHandler from './utility/ErrorHandler.svelte';
  import { useSettings } from './utility/metadataLoaders';
  import OpenTabsOnStartup from './utility/OpenTabsOnStartup.svelte';

  const settings = useSettings();
</script>

<DataGridRowHeightMeter />
<ErrorHandler />
<PluginsProvider />
<CommandListener />
<OpenTabsOnStartup />

{#if $settings}
  <Screen />
{:else}
  <LoadingInfo message="Loading settings..." />
{/if}
