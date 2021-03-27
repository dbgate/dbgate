<script lang="ts">
  import CommandListener from './commands/CommandListener.svelte';

  import PluginsProvider from './plugins/PluginsProvider.svelte';
  import Screen from './Screen.svelte';
  import ErrorHandler from './utility/ErrorHandler.svelte';
</script>

<ErrorHandler />
<PluginsProvider />
<CommandListener />
<Screen />
