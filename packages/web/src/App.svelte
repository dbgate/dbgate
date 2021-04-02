<script lang="ts">
  import CommandListener from './commands/CommandListener.svelte';
  import DataGridRowHeightMeter from './datagrid/DataGridRowHeightMeter.svelte';

  import PluginsProvider from './plugins/PluginsProvider.svelte';
  import Screen from './Screen.svelte';
  import ErrorHandler from './utility/ErrorHandler.svelte';
  import OpenTabsOnStartup from './utility/OpenTabsOnStartup.svelte';
</script>

<DataGridRowHeightMeter />
<ErrorHandler />
<PluginsProvider />
<CommandListener />
<OpenTabsOnStartup />
<Screen />
