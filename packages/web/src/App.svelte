<script lang="ts">
  import CommandListener from './commands/CommandListener.svelte';

  import PluginsProvider from './plugins/PluginsProvider.svelte';
  import Screen from './Screen.svelte';
  import './utility/errorHandler';
</script>

<PluginsProvider />
<CommandListener />
<Screen />
