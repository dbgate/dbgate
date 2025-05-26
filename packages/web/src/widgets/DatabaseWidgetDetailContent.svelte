<script lang="ts">
  import { findEngineDriver } from 'dbgate-tools';
  import { currentDatabase, extensions, pinnedDatabases, pinnedTables, selectedWidget } from '../stores';
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
  import FormStyledButton from '../buttons/FormStyledButton.svelte';

  export let domSqlObjectList = null;
  export let showCloudConnection;

  $: conid = $currentDatabase?.connection?._id;
  $: connection = useConnectionInfo({ conid });
  $: driver = findEngineDriver($connection, $extensions);
  $: singleDatabase = $currentDatabase?.connection?.singleDatabase;
  $: database = $currentDatabase?.name;

  $: correctCloudStatus =
    !conid ||
    (!showCloudConnection && !conid?.startsWith('cloud://')) ||
    (showCloudConnection && conid?.startsWith('cloud://'));
</script>

<WidgetColumnBarItem
  title={_t('widget.pinned', { defaultMessage: 'Pinned' })}
  name="pinned"
  height="15%"
  storageName="pinnedItemsWidget"
  skip={!_.compact($pinnedDatabases).length &&
    !$pinnedTables.some(x => x && x.conid == conid && x.database == $currentDatabase?.name)}
  positiveCondition={correctCloudStatus}
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
  positiveCondition={correctCloudStatus}
>
  <SqlObjectList {conid} {database} bind:this={domSqlObjectList} />
</WidgetColumnBarItem>

<WidgetColumnBarItem
  title={_t('widget.keys', { defaultMessage: 'Keys' })}
  name="dbObjects"
  storageName="dbObjectsWidget"
  skip={!(conid && (database || singleDatabase) && driver?.databaseEngineTypes?.includes('keyvalue'))}
  positiveCondition={correctCloudStatus}
>
  <DbKeysTree {conid} {database} treeKeySeparator={$connection?.treeKeySeparator || ':'} />
</WidgetColumnBarItem>

<WidgetColumnBarItem
  title={_t('widget.databaseContent', { defaultMessage: 'Database content' })}
  name="dbObjects"
  storageName="dbObjectsWidget"
  skip={conid && (database || singleDatabase)}
  positiveCondition={correctCloudStatus}
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
  positiveCondition={correctCloudStatus}
>
  <WidgetsInnerContainer>
    <FocusedConnectionInfoWidget {conid} {database} connection={$connection} />

    <ErrorInfo
      message={_t('error.driverNotFound', { defaultMessage: 'Invalid database connection, driver not found' })}
    />
  </WidgetsInnerContainer>
</WidgetColumnBarItem>

<WidgetColumnBarItem
  title={_t('widget.databaseContent', { defaultMessage: 'Database content' })}
  name="incorrectClaudStatus"
  height="15%"
  storageName="incorrectClaudStatusWidget"
  skip={correctCloudStatus}
>
  <WidgetsInnerContainer>
    <ErrorInfo
      message={showCloudConnection
        ? _t('error.selectedNotCloudConnection', { defaultMessage: 'Selected connection is not from DbGate cloud' })
        : _t('error.selectedCloudConnection', { defaultMessage: 'Selected connection is from DbGate cloud' })}
    />

    <div class="incorrect-cloud-status-wrapper">
      <FormStyledButton
        value={`Show database content`}
        skipWidth
        on:click={() => {
          $selectedWidget = conid?.startsWith('cloud://') ? 'cloud-private' : 'database';
        }}
      />
    </div>
  </WidgetsInnerContainer>
</WidgetColumnBarItem>

<style>
  .incorrect-cloud-status-wrapper {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: stretch;
    margin-top: 10px;
  }
</style>
