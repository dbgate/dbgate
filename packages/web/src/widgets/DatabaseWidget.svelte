<script lang="ts">
  import { findEngineDriver } from 'dbgate-tools';
  import { currentDatabase, extensions } from '../stores';
  import { useConfig, useConnectionInfo } from '../utility/metadataLoaders';

  import ConnectionList from './ConnectionList.svelte';
  import SqlObjectListWrapper from './SqlObjectListWrapper.svelte';

  import WidgetColumnBar from './WidgetColumnBar.svelte';
  import WidgetColumnBarItem from './WidgetColumnBarItem.svelte';

  export let hidden = false;

  $: conid = $currentDatabase?.connection?._id;
  $: connection = useConnectionInfo({ conid });
  $: driver = findEngineDriver($connection, $extensions);
  $: config = useConfig();
</script>

<WidgetColumnBar {hidden}>
  {#if !$config?.singleDatabase}
    <WidgetColumnBarItem title="Connections" name="connections" height="35%" storageName="connectionsWidget">
      <ConnectionList />
    </WidgetColumnBarItem>
  {/if}
  <WidgetColumnBarItem
    title={driver?.dialect?.nosql ? 'Collections' : 'Tables, views, functions'}
    name="dbObjects"
    storageName="dbObjectsWidget"
  >
    <SqlObjectListWrapper />
  </WidgetColumnBarItem>
</WidgetColumnBar>
