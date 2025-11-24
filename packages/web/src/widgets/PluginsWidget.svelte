<script lang="ts">
  import AvailablePluginsList from '../plugins/AvailablePluginsList.svelte';
  import InstalledPluginsList from '../plugins/InstalledPluginsList.svelte';

  import WidgetColumnBar from './WidgetColumnBar.svelte';
  import WidgetColumnBarItem from './WidgetColumnBarItem.svelte';

  import { _t } from '../translations';
</script>

<WidgetColumnBar>
  <WidgetColumnBarItem title={_t('widgets.installedExtensions', { defaultMessage: 'Installed extensions' })} name="installed" height="50%" storageName='installedPluginsWidget'>
    <InstalledPluginsList />
  </WidgetColumnBarItem>
  <WidgetColumnBarItem title={_t('widgets.availableExtensions', { defaultMessage: 'Available extensions' })} name="all" storageName='allPluginsWidget'>
    <AvailablePluginsList />
  </WidgetColumnBarItem>
</WidgetColumnBar>
