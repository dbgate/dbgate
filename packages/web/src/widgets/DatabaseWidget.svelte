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
  import DbKeysTree from './DbKeysTree.svelte';
  import SingleConnectionDatabaseList from './SingleConnectionDatabaseList.svelte';
  import _ from 'lodash';

  export let hidden = false;

  $: conid = $currentDatabase?.connection?._id;
  $: connection = useConnectionInfo({ conid });
  $: driver = findEngineDriver($connection, $extensions);
  $: config = useConfig();
  $: singleDatabase = $currentDatabase?.connection?.singleDatabase;
  $: database = $currentDatabase?.name;
</script>

<WidgetColumnBar {hidden}>
  {#if $config?.singleConnection}
    <WidgetColumnBarItem title="Databases" name="databases" height="35%" storageName="databasesWidget">
      <SingleConnectionDatabaseList connection={$config?.singleConnection} />
    </WidgetColumnBarItem>
  {:else if !$config?.singleDbConnection}
    <WidgetColumnBarItem title="Connections" name="connections" height="35%" storageName="connectionsWidget">
      <ConnectionList />
    </WidgetColumnBarItem>
  {/if}
  <WidgetColumnBarItem
    title="Pinned"
    name="pinned"
    height="15%"
    storageName="pinnedItemsWidget"
    skip={!_.compact($pinnedDatabases).length &&
      !$pinnedTables.some(x => x && x.conid == conid && x.database == $currentDatabase?.name)}
  >
    <PinnedObjectsList />
  </WidgetColumnBarItem>

  <WidgetColumnBarItem
    title={driver?.databaseEngineTypes?.includes('document') ? 'Collections' : 'Tables, views, functions'}
    name="dbObjects"
    storageName="dbObjectsWidget"
    skip={!(
      conid &&
      (database || singleDatabase) &&
      (driver?.databaseEngineTypes?.includes('sql') || driver?.databaseEngineTypes?.includes('document'))
    )}
  >
    <SqlObjectList {conid} {database} />
  </WidgetColumnBarItem>

  <WidgetColumnBarItem
    title={'Keys'}
    name="dbObjects"
    storageName="dbObjectsWidget"
    skip={!(conid && (database || singleDatabase) && driver?.databaseEngineTypes?.includes('keyvalue'))}
  >
    <DbKeysTree {conid} {database} />
  </WidgetColumnBarItem>

  <WidgetColumnBarItem
    title="Database content"
    name="dbObjects"
    storageName="dbObjectsWidget"
    skip={conid && (database || singleDatabase)}
  >
    <WidgetsInnerContainer>
      <ErrorInfo message="Database not selected" icon="img alert" />
    </WidgetsInnerContainer>
  </WidgetColumnBarItem>
</WidgetColumnBar>
