<script lang="ts">
  import { findEngineDriver } from 'dbgate-tools';
  import { currentDatabase, extensions, pinnedDatabases, pinnedTables } from '../stores';
  import { useConnectionInfo } from '../utility/metadataLoaders';

  import PinnedObjectsList from './PinnedObjectsList.svelte';
  import ErrorInfo from '../elements/ErrorInfo.svelte';
  import WidgetsInnerContainer from './WidgetsInnerContainer.svelte';

  import WidgetColumnBarItem from './WidgetColumnBarItem.svelte';
  import SqlObjectList from './SqlObjectList.svelte';
  import DbKeysTree from './DbKeysTree.svelte';
  import _ from 'lodash';
  import FocusedConnectionInfoWidget from './FocusedConnectionInfoWidget.svelte';
  import { _t } from '../translations';

  export let domSqlObjectList = null;

  $: conid = $currentDatabase?.connection?._id;
  $: connection = useConnectionInfo({ conid });
  $: driver = findEngineDriver($connection, $extensions);
  $: singleDatabase = $currentDatabase?.connection?.singleDatabase;
  $: database = $currentDatabase?.name;
</script>

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
  <DbKeysTree {conid} {database} treeKeySeparator={$connection?.treeKeySeparator || ':'} />
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
