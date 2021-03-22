<script lang="ts">
  import { useInstalledPlugins } from '../utility/metadataLoaders';
  import PluginsList from './PluginsList.svelte';
  import WidgetsInnerContainer from '../widgets/WidgetsInnerContainer.svelte';

  $: plugins = useInstalledPlugins();
</script>

<WidgetsInnerContainer>
  <PluginsList plugins={$plugins} />
</WidgetsInnerContainer>
