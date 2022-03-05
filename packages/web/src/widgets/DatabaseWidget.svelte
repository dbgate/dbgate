<script lang="ts">
  import { findEngineDriver } from 'dbgate-tools';
  import { currentDatabase, extensions, pinnedDatabases, pinnedTables } from '../stores';
  import { useConfig, useConnectionInfo } from '../utility/metadataLoaders';

  import ConnectionList from './ConnectionList.svelte';
  import PinnedObjectsList from './PinnedObjectsList.svelte';
  import ErrorInfo from '../elements/ErrorInfo.svelte';
  import WidgetsInnerContainer from './WidgetsInnerContainer.svelte';

  import WidgetColumnBar from './WidgetColumnBar.svelte';
  import WidgetColumnBarItem from './WidgetColumnBarItem.svelte';
  import SqlObjectList from './SqlObjectList.svelte';

  export let hidden = false;

  $: conid = $currentDatabase?.connection?._id;
  $: connection = useConnectionInfo({ conid });
  $: driver = findEngineDriver($connection, $extensions);
  $: config = useConfig();
  $: singleDatabase = $currentDatabase?.connection?.singleDatabase;
  $: database = $currentDatabase?.name;
</script>

<WidgetColumnBar {hidden}>
  {#if !$config?.singleDatabase}
    <WidgetColumnBarItem title="Connections" name="connections" height="35%" storageName="connectionsWidget">
      <ConnectionList />
    </WidgetColumnBarItem>
  {/if}
  <WidgetColumnBarItem
    title="Pinned"
    name="pinned"
    height="15%"
    storageName="pinnedItemsWidget"
    skip={!$pinnedDatabases?.length &&
      !$pinnedTables.some(x => x.conid == conid && x.database == $currentDatabase?.name)}
  >
    <PinnedObjectsList />
  </WidgetColumnBarItem>

  {#if conid && (database || singleDatabase)}
    {#if driver?.databaseEngineTypes?.includes('sql') || driver?.databaseEngineTypes?.includes('document')}
      <WidgetColumnBarItem
        title={driver?.databaseEngineTypes?.includes('document') ? 'Collections' : 'Tables, views, functions'}
        name="dbObjects"
        storageName="dbObjectsWidget"
      >
        <SqlObjectList {conid} {database} />
      </WidgetColumnBarItem>
    {:else if driver?.databaseEngineTypes?.includes('keyvalue')}
      <WidgetColumnBarItem title={'Keys'} name="dbObjects" storageName="dbObjectsWidget" />
    {/if}
  {:else}
    <WidgetColumnBarItem title="Database content" name="dbObjects" storageName="dbObjectsWidget">
      <WidgetsInnerContainer>
        <ErrorInfo message="Database not selected" icon="img alert" />
      </WidgetsInnerContainer>
    </WidgetColumnBarItem>
  {/if}
</WidgetColumnBar>
