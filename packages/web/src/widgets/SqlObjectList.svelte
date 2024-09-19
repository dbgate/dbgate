<script lang="ts" context="module">
  function generateObjectList(seed = 0) {
    const counts = [1000, 1200, 1100, 2100, 720];
    const schemas = ['A', 'dev', 'public', 'dbo'];
    const types = ['tables', 'views', 'functions', 'procedures', 'matviews', 'triggers'];
    const res = _.range(1, counts[seed % counts.length]).map(i => ({
      pureName: `name ${i}`,
      schemaName: schemas[i % schemas.length],
      objectTypeField: types[i % types.length],
    }));
    return res;
  }
</script>

<script lang="ts">
  import InlineButton from '../buttons/InlineButton.svelte';
  import SearchInput from '../elements/SearchInput.svelte';
  import WidgetsInnerContainer from './WidgetsInnerContainer.svelte';
  import { useConnectionInfo, useDatabaseInfo, useDatabaseStatus, useSchemaList, useUsedApps } from '../utility/metadataLoaders';
  import SearchBoxWrapper from '../elements/SearchBoxWrapper.svelte';
  import AppObjectList from '../appobj/AppObjectList.svelte';
  import _ from 'lodash';
  import * as databaseObjectAppObject from '../appobj/DatabaseObjectAppObject.svelte';
  import SubColumnParamList from '../appobj/SubColumnParamList.svelte';
  import { chevronExpandIcon } from '../icons/expandIcons';
  import ErrorInfo from '../elements/ErrorInfo.svelte';
  import LoadingInfo from '../elements/LoadingInfo.svelte';
  import { getObjectTypeFieldLabel } from '../utility/common';
  import DropDownButton from '../buttons/DropDownButton.svelte';
  import FontIcon from '../icons/FontIcon.svelte';
  import CloseSearchButton from '../buttons/CloseSearchButton.svelte';
  import { findEngineDriver } from 'dbgate-tools';
  import { currentDatabase, extensions } from '../stores';
  import newQuery from '../query/newQuery';
  import runCommand from '../commands/runCommand';
  import { apiCall } from '../utility/api';
  import { filterAppsForDatabase } from '../utility/appTools';
  import SchemaSelector from './SchemaSelector.svelte';
  import { appliedCurrentSchema } from '../stores';

  export let conid;
  export let database;

  let filter = '';
  let selectedSchema = null;

  $: objects = useDatabaseInfo({ conid, database });
  $: status = useDatabaseStatus({ conid, database });
  $: schemaList = useSchemaList({ conid, database });

  $: connection = useConnectionInfo({ conid });
  $: driver = findEngineDriver($connection, $extensions);

  $: apps = useUsedApps();

  $: dbApps = filterAppsForDatabase($currentDatabase?.connection, $currentDatabase?.name, $apps || []);

  // $: console.log('OBJECTS', $objects);

  $: objectList = _.flatten([
    ...['tables', 'collections', 'views', 'matviews', 'procedures', 'functions'].map(objectTypeField =>
      _.sortBy(
        (($objects || {})[objectTypeField] || []).map(obj => ({ ...obj, objectTypeField })),
        ['schemaName', 'pureName']
      )
    ),
    ...dbApps.map(app =>
      app.queries.map(query => ({
        objectTypeField: 'queries',
        pureName: query.name,
        schemaName: app.name,
        sql: query.sql,
      }))
    ),
  ]);

  // let generateIndex = 0;
  // setInterval(() => (generateIndex += 1), 2000);
  // $: objectList = generateObjectList(generateIndex);

  const handleRefreshDatabase = () => {
    apiCall('database-connections/refresh', { conid, database });
  };

  function createAddMenu() {
    const res = [];
    if (driver?.databaseEngineTypes?.includes('document')) {
      res.push({ command: 'new.collection' });
    }
    if (driver?.databaseEngineTypes?.includes('sql')) {
      res.push({ command: 'new.table' });
    }
    if (driver)
      res.push(
        ...driver.getNewObjectTemplates().map(tpl => ({
          text: tpl.label,
          onClick: () => {
            newQuery({
              initialData: tpl.sql,
            });
          },
        }))
      );
    return res;
  }

  $: flatFilteredList = objectList.filter(data => {
    const matcher = databaseObjectAppObject.createMatcher(data);
    if (matcher && !matcher(filter)) return false;
    return true;
  });
</script>

{#if $status && $status.name == 'error'}
  <WidgetsInnerContainer>
    <ErrorInfo message={$status.message} icon="img error" />
    <InlineButton on:click={handleRefreshDatabase}>Refresh</InlineButton>
  </WidgetsInnerContainer>
{:else if objectList.length == 0 && $status && $status.name != 'pending' && $status.name != 'checkStructure' && $status.name != 'loadStructure' && $objects}
  <WidgetsInnerContainer>
    <ErrorInfo
      message={`Database ${database} is empty or structure is not loaded, press Refresh button to reload structure`}
      icon="img alert"
    />
    <div class="m-1" />
    <InlineButton on:click={handleRefreshDatabase}>Refresh</InlineButton>
    {#if driver?.databaseEngineTypes?.includes('sql')}
      <div class="m-1" />
      <InlineButton on:click={() => runCommand('new.table')}>New table</InlineButton>
    {/if}
    {#if driver?.databaseEngineTypes?.includes('document')}
      <div class="m-1" />
      <InlineButton on:click={() => runCommand('new.collection')}
        >New {driver?.collectionSingularLabel ?? 'collection/container'}</InlineButton
      >
    {/if}
  </WidgetsInnerContainer>
{:else}
  <SearchBoxWrapper>
    <SearchInput placeholder="Search in tables, objects, # prefix in columns" bind:value={filter} />
    <CloseSearchButton bind:filter />
    <DropDownButton icon="icon plus-thick" menu={createAddMenu} />
    <InlineButton on:click={handleRefreshDatabase} title="Refresh database connection and object list" square>
      <FontIcon icon="icon refresh" />
    </InlineButton>
  </SearchBoxWrapper>
  <SchemaSelector
    schemaList={$schemaList}
    bind:selectedSchema
    objectList={flatFilteredList}
    valueStorageKey={`sql-object-list-schema-${conid}-${database}`}
    {conid}
    {database}
  />

  <WidgetsInnerContainer>
    {#if ($status && ($status.name == 'pending' || $status.name == 'checkStructure' || $status.name == 'loadStructure') && $objects) || !$objects}
      <LoadingInfo message={$status?.feedback?.analysingMessage || 'Loading database structure'} />
    {:else}
      <AppObjectList
        list={objectList
          .filter(x => ($appliedCurrentSchema ? x.schemaName == $appliedCurrentSchema : true))
          .map(x => ({ ...x, conid, database }))}
        module={databaseObjectAppObject}
        groupFunc={data => getObjectTypeFieldLabel(data.objectTypeField, driver)}
        subItemsComponent={SubColumnParamList}
        isExpandable={data =>
          data.objectTypeField == 'tables' || data.objectTypeField == 'views' || data.objectTypeField == 'matviews'}
        expandIconFunc={chevronExpandIcon}
        {filter}
        passProps={{
          showPinnedInsteadOfUnpin: true,
          connection: $connection,
          hideSchemaName: !!$appliedCurrentSchema,
        }}
      />
    {/if}
  </WidgetsInnerContainer>
{/if}
