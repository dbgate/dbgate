<script lang="ts">
  import AvailablePluginsList from '../plugins/AvailablePluginsList.svelte';
  import InstalledPluginsList from '../plugins/InstalledPluginsList.svelte';

  import WidgetColumnBar from './WidgetColumnBar.svelte';
  import WidgetColumnBarItem from './WidgetColumnBarItem.svelte';
</script>

<WidgetColumnBar>
  <WidgetColumnBarItem title="Installed extensions" name="installed" height="50%" storageName='installedPluginsWidget'>
    <InstalledPluginsList />
  </WidgetColumnBarItem>
  <WidgetColumnBarItem title="Available extensions" name="all" storageName='allPluginsWidget'>
    <AvailablePluginsList />
  </WidgetColumnBarItem>
</WidgetColumnBar>
