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
  import FocusedConnectionInfoWidget from './FocusedConnectionInfoWidget.svelte';
  import { _t } from '../translations';

  export let hidden = false;
  let domSqlObjectList = null;

  $: conid = $currentDatabase?.connection?._id;
  $: connection = useConnectionInfo({ conid });
  $: driver = findEngineDriver($connection, $extensions);
  $: config = useConfig();
  $: singleDatabase = $currentDatabase?.connection?.singleDatabase;
  $: database = $currentDatabase?.name;
</script>

<WidgetColumnBar {hidden}>
  {#if $config?.singleConnection}
    <WidgetColumnBarItem
      title={_t('widget.databases', { defaultMessage: 'Databases' })}
      name="databases"
      height="35%"
      storageName="databasesWidget"
    >
      <SingleConnectionDatabaseList connection={$config?.singleConnection} />
    </WidgetColumnBarItem>
  {:else if !$config?.singleDbConnection}
    <WidgetColumnBarItem
      title={_t('common.connections', { defaultMessage: 'Connections' })}
      name="connections"
      height="35%"
      storageName="connectionsWidget"
    >
      <ConnectionList passProps={{ onFocusSqlObjectList: () => domSqlObjectList.focus() }} />
    </WidgetColumnBarItem>
  {/if}
  <WidgetColumnBarItem
    title={_t('widget.pinned', { defaultMessage: 'Pinned' })}
    name="pinned"
    height="15%"
    storageName="pinnedItemsWidget"
    skip={!_.compact($pinnedDatabases).length &&
      !$pinnedTables.some(x => x && x.conid == conid && x.database == $currentDatabase?.name)}
  >
    <PinnedObjectsList />
  </WidgetColumnBarItem>

  <WidgetColumnBarItem
    title={driver?.databaseEngineTypes?.includes('document')
      ? (driver?.collectionPluralLabel ?? 'Collections/containers')
      : _t('widget.tablesViewsFunctions', { defaultMessage: 'Tables, views, functions' })}
    name="dbObjects"
    storageName="dbObjectsWidget"
    skip={!(
      conid &&
      (database || singleDatabase) &&
      (driver?.databaseEngineTypes?.includes('sql') || driver?.databaseEngineTypes?.includes('document'))
    )}
  >
    <SqlObjectList {conid} {database} bind:this={domSqlObjectList} />
  </WidgetColumnBarItem>

  <WidgetColumnBarItem
    title={_t('widget.keys', { defaultMessage: 'Keys' })}
    name="dbObjects"
    storageName="dbObjectsWidget"
    skip={!(conid && (database || singleDatabase) && driver?.databaseEngineTypes?.includes('keyvalue'))}
  >
    <DbKeysTree {conid} {database} />
  </WidgetColumnBarItem>

  <WidgetColumnBarItem
    title={_t('widget.databaseContent', { defaultMessage: 'Database content' })}
    name="dbObjects"
    storageName="dbObjectsWidget"
    skip={conid && (database || singleDatabase)}
  >
    <WidgetsInnerContainer>
      <FocusedConnectionInfoWidget {conid} {database} connection={$connection} />

      <ErrorInfo message="Database not selected" icon="img alert" />
    </WidgetsInnerContainer>
  </WidgetColumnBarItem>

  <WidgetColumnBarItem
    title={_t('widget.databaseContent', { defaultMessage: 'Database content' })}
    name="dbObjects"
    storageName="dbObjectsWidget"
    skip={!(conid && (database || singleDatabase) && !driver)}
  >
    <WidgetsInnerContainer>
      <FocusedConnectionInfoWidget {conid} {database} connection={$connection} />

      <ErrorInfo
        message={_t('error.driverNotFound', { defaultMessage: 'Invalid database connection, driver not found' })}
      />
    </WidgetsInnerContainer>
  </WidgetColumnBarItem>
</WidgetColumnBar>
