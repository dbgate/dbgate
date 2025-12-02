<script lang="ts" context="module">
  function generateObjectList(seed = 0) {
    const counts = [1000, 1200, 1100, 2100, 720];
    const schemas = ['A', 'dev', 'public', 'dbo'];
    const types = ['tables', 'views', 'functions', 'procedures', 'matviews', 'triggers', 'schedulerEvents'];
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
  import {
    useAllApps,
    useConnectionInfo,
    useDatabaseInfo,
    useDatabaseStatus,
    useSchemaList,
  } from '../utility/metadataLoaders';
  import SearchBoxWrapper from '../elements/SearchBoxWrapper.svelte';
  import AppObjectList from '../appobj/AppObjectList.svelte';
  import _ from 'lodash';
  import * as databaseObjectAppObject from '../appobj/DatabaseObjectAppObject.svelte';
  import SubTableColumnList from '../appobj/SubTableColumnList.svelte';
  import { chevronExpandIcon } from '../icons/expandIcons';
  import ErrorInfo from '../elements/ErrorInfo.svelte';
  import LoadingInfo from '../elements/LoadingInfo.svelte';
  import { getDatabasStatusMenu, getObjectTypeFieldLabel } from '../utility/common';
  import DropDownButton from '../buttons/DropDownButton.svelte';
  import FontIcon from '../icons/FontIcon.svelte';
  import CloseSearchButton from '../buttons/CloseSearchButton.svelte';
  import { extractDbNameFromComposite, findEngineDriver } from 'dbgate-tools';
  import {
    currentDatabase,
    databaseObjectAppObjectSearchSettings,
    extensions,
    focusedConnectionOrDatabase,
    getDatabaseObjectAppObjectSearchSettings,
    getSelectedDatabaseObjectAppObject,
    selectedDatabaseObjectAppObject,
  } from '../stores';
  import newQuery from '../query/newQuery';
  import runCommand from '../commands/runCommand';
  import { apiCall } from '../utility/api';
  import { filterAppsForDatabase } from '../utility/appTools';
  import SchemaSelector from './SchemaSelector.svelte';
  import { appliedCurrentSchema } from '../stores';
  import AppObjectListHandler from './AppObjectListHandler.svelte';
  import { matchDatabaseObjectAppObject } from '../appobj/appObjectTools';
  import FocusedConnectionInfoWidget from './FocusedConnectionInfoWidget.svelte';
  import SubProcedureParamList from '../appobj/SubProcedureParamList.svelte';
  import SubProcedureLineList from '../appobj/SubProcedureLineList.svelte';
  import { _t } from '../translations';

  export let conid;
  export let database;

  let filter = '';
  let domContainer = null;
  let domFilter = null;
  let domListHandler;
  let expandedObjects = [];

  $: objects = useDatabaseInfo({ conid, database });
  $: status = useDatabaseStatus({ conid, database });
  $: schemaList = useSchemaList({ conid, database });

  $: connection = useConnectionInfo({ conid });
  $: driver = findEngineDriver($connection, $extensions);

  $: apps = useAllApps();
  $: appsForDb = filterAppsForDatabase($connection, database, $apps || [], $objects);

  // $: console.log('OBJECTS', $objects);

  $: sortArgs =
    $databaseObjectAppObjectSearchSettings.sortBy == 'rowCount'
      ? [
          ['rowCount', 'sizeBytes', 'schemaName', 'pureName'],
          ['desc', 'desc', 'asc', 'asc'],
        ]
      : $databaseObjectAppObjectSearchSettings.sortBy == 'sizeBytes'
        ? [
            ['sizeBytes', 'rowCount', 'schemaName', 'pureName'],
            ['desc', 'desc', 'asc', 'asc'],
          ]
        : [
            ['schemaName', 'pureName'],
            ['asc', 'asc'],
          ];

  $: objectList = _.flatten([
    ...['tables', 'collections', 'views', 'matviews', 'procedures', 'functions', 'triggers', 'schedulerEvents'].map(
      objectTypeField =>
        _.orderBy(
          (($objects || {})[objectTypeField] || []).map(obj => ({ ...obj, objectTypeField })),
          sortArgs[0],
          // @ts-ignore
          sortArgs[1]
        )
    ),
    ...appsForDb.map(app =>
      Object.values(app.files || {})
        .filter(x => x.type == 'query')
        .map(query => ({
          objectTypeField: 'queries',
          pureName: query.label,
          sql: query.sql,
        }))
    ),
  ]);

  // let generateIndex = 0;
  // setInterval(() => (generateIndex += 1), 2000);
  // $: objectList = generateObjectList(generateIndex);

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

  function createRefreshDatabaseMenu() {
    return getDatabasStatusMenu({ conid, database });
  }

  function handleFullRefreshDatabase() {
    apiCall('database-connections/sync-model', { conid, database, isFullRefresh: true });
    apiCall('database-connections/dispatch-database-changed-event', { event: 'schema-list-changed', conid, database });
  }

  function createSearchMenu() {
    const res = [];
    res.push({ label: _t('sqlObject.searchBy', { defaultMessage: 'Search by:' }), isBold: true, disabled: true });
    if (driver?.databaseEngineTypes?.includes('document')) {
      res.push({
        label: _t('sqlObject.collectionName', { defaultMessage: 'Collection name' }),
        switchValue: 'pureName',
      });
    }
    if (driver?.databaseEngineTypes?.includes('sql')) {
      res.push({
        label: _t('sqlObject.tableViewProcedureName', { defaultMessage: 'Table/view/procedure name' }),
        switchValue: 'pureName',
      });
      res.push({ label: _t('sqlObject.schemaName', { defaultMessage: 'Schema' }), switchValue: 'schemaName' });
      res.push({ label: _t('sqlObject.columnName', { defaultMessage: 'Column name' }), switchValue: 'columnName' });
      res.push({
        label: _t('sqlObject.columnDataType', { defaultMessage: 'Column data type' }),
        switchValue: 'columnDataType',
      });
      res.push({
        label: _t('sqlObject.tableComment', { defaultMessage: 'Table comment' }),
        switchValue: 'tableComment',
      });
      res.push({
        label: _t('sqlObject.columnComment', { defaultMessage: 'Column comment' }),
        switchValue: 'columnComment',
      });
      res.push({
        label: _t('sqlObject.viewProcedureTriggerText', { defaultMessage: 'View/procedure/trigger text' }),
        switchValue: 'sqlObjectText',
      });
      res.push({ label: _t('sqlObject.tableEngine', { defaultMessage: 'Table engine' }), switchValue: 'tableEngine' });
      res.push({
        label: _t('sqlObject.tablesWithRows', { defaultMessage: 'Only tables with rows' }),
        switchValue: 'tablesWithRows',
      });
    }

    res.push({ label: _t('sqlObject.sortBy', { defaultMessage: 'Sort by:' }), isBold: true, disabled: true });
    res.push({
      label: _t('sqlObject.name', { defaultMessage: 'Name' }),
      switchOption: 'sortBy',
      switchOptionValue: 'name',
      switchOptionIsDefault: true,
      closeOnSwitchClick: true,
    });
    res.push({
      label: _t('sqlObject.rowCount', { defaultMessage: 'Row count' }),
      switchOption: 'sortBy',
      switchOptionValue: 'rowCount',
      closeOnSwitchClick: true,
    });
    res.push({
      label: _t('sqlObject.sizeBytes', { defaultMessage: 'Size (bytes)' }),
      switchOption: 'sortBy',
      switchOptionValue: 'sizeBytes',
      closeOnSwitchClick: true,
    });

    return res.map(item => ({
      ...item,
      switchStore: databaseObjectAppObjectSearchSettings,
      switchStoreGetter: getDatabaseObjectAppObjectSearchSettings,
    }));
  }

  $: matcher = databaseObjectAppObject.createMatcher(filter, $databaseObjectAppObjectSearchSettings);
  $: flatFilteredList = objectList.filter(data => !matcher || matcher(data));

  export function focus() {
    domListHandler?.focusFirst();
  }

  $: differentFocusedDb =
    $focusedConnectionOrDatabase &&
    ($focusedConnectionOrDatabase.conid != conid ||
      ($focusedConnectionOrDatabase?.database &&
        $focusedConnectionOrDatabase?.database != extractDbNameFromComposite(database)));

  // $: console.log('STATUS', $status);

  function getAppObjectGroup(data) {
    if (data.objectTypeField == 'tables') {
      if (data.pureName.match(databaseObjectAppObject.TABLE_BACKUP_REGEX)) {
        return _t('dbObject.tableBackups', { defaultMessage: 'Table Backups' });
      }
    }
    return getObjectTypeFieldLabel(data.objectTypeField, driver);
  }
</script>

{#if $status && $status.name == 'error'}
  {#if differentFocusedDb}
    <FocusedConnectionInfoWidget {conid} {database} connection={$connection} />
  {/if}

  <WidgetsInnerContainer hideContent={differentFocusedDb}>
    <ErrorInfo message={$status.message} icon="img error" />
    <InlineButton on:click={handleFullRefreshDatabase}
      >{_t('common.refresh', { defaultMessage: 'Refresh' })}</InlineButton
    >
  </WidgetsInnerContainer>
{:else if objectList.length == 0 && $status && $status.name != 'pending' && $status.name != 'checkStructure' && $status.name != 'loadStructure' && $objects}
  <SchemaSelector
    schemaList={_.isArray($schemaList) ? $schemaList : null}
    objectList={flatFilteredList}
    connection={$connection}
    {conid}
    {database}
    {driver}
  />
  {#if differentFocusedDb}
    <FocusedConnectionInfoWidget {conid} {database} connection={$connection} />
  {/if}

  <WidgetsInnerContainer hideContent={differentFocusedDb}>
    <ErrorInfo
      message={_t('sqlObject.databaseEmpty', {
        defaultMessage:
          'Database {database} is empty or structure is not loaded, press Refresh button to reload structure',
        values: { database },
      })}
      icon="img alert"
    />
    <div class="m-1" />
    <InlineButton on:click={handleFullRefreshDatabase}>{_t('common.refresh', { defaultMessage: 'Refresh' })}</InlineButton>
    {#if driver?.databaseEngineTypes?.includes('sql')}
      <div class="m-1" />
      <InlineButton on:click={() => runCommand('new.table')}
        >{_t('database.newTable', { defaultMessage: 'New table' })}</InlineButton
      >
    {/if}
    {#if driver?.databaseEngineTypes?.includes('document')}
      <div class="m-1" />
      <InlineButton on:click={() => runCommand('new.collection')}
        >{_t('sqlObject.newCollection', { defaultMessage: 'New collection/container' })}</InlineButton
      >
    {/if}
  </WidgetsInnerContainer>
{:else}
  <SearchBoxWrapper>
    <SearchInput
      placeholder={_t('sqlObject.search.placeholder', { defaultMessage: 'Search in tables, views, procedures' })}
      bind:value={filter}
      bind:this={domFilter}
      onFocusFilteredList={() => {
        domListHandler?.focusFirst();
      }}
      data-testid="SqlObjectList_search"
    />
    <CloseSearchButton bind:filter />
    <DropDownButton
      icon={filter ? 'img filter-active' : 'icon filter'}
      menu={createSearchMenu}
      square={!!filter}
      narrow={false}
      data-testid="SqlObjectList_searchMenuDropDown"
    />
    {#if !filter}
      <DropDownButton icon="icon plus-thick" menu={createAddMenu} />
    {/if}
    <DropDownButton
      menu={createRefreshDatabaseMenu}
      title={_t('sqlObjectList.refreshDatabase', { defaultMessage: 'Refresh database connection and object list' })}
      square
      narrow={false}
      data-testid="SqlObjectList_refreshButton"
      icon="icon dots-vertical"
    />
  </SearchBoxWrapper>
  <SchemaSelector
    schemaList={_.isArray($schemaList) ? $schemaList : null}
    objectList={flatFilteredList}
    connection={$connection}
    {conid}
    {database}
    {driver}
    negativeMarginTop
  />

  {#if differentFocusedDb}
    <FocusedConnectionInfoWidget {conid} {database} connection={$connection} />
  {/if}

  <WidgetsInnerContainer
    bind:this={domContainer}
    hideContent={differentFocusedDb}
    data-testid="SqlObjectList_container"
  >
    {#if ($status && ($status.name == 'pending' || $status.name == 'checkStructure' || $status.name == 'loadStructure') && $objects) || !$objects}
      <LoadingInfo
        message={$status?.feedback?.analysingMessage ||
          _t('sqlObject.loadingStructure', { defaultMessage: 'Loading database structure' })}
      />
    {:else}
      <AppObjectListHandler
        bind:this={domListHandler}
        list={flatFilteredList.map(x => ({ ...x, conid, database }))}
        selectedObjectStore={selectedDatabaseObjectAppObject}
        getSelectedObject={getSelectedDatabaseObjectAppObject}
        selectedObjectMatcher={matchDatabaseObjectAppObject}
        handleObjectClick={(data, clickAction) => databaseObjectAppObject.handleObjectClick(data, clickAction)}
        onScrollTop={() => {
          domContainer?.scrollTop();
        }}
        onFocusFilterBox={text => {
          domFilter?.focus(text);
        }}
        handleExpansion={(data, value) => {
          expandedObjects = value
            ? [...expandedObjects, `${data.objectTypeField}||${data.schemaName}||${data.pureName}`]
            : expandedObjects.filter(x => x != `${data.objectTypeField}||${data.schemaName}||${data.pureName}`);
        }}
      >
        <AppObjectList
          list={objectList
            .filter(x => x.schemaName == null || ($appliedCurrentSchema ? x.schemaName == $appliedCurrentSchema : true))
            .map(x => ({ ...x, conid, database }))}
          module={databaseObjectAppObject}
          groupFunc={getAppObjectGroup}
          subItemsComponent={(data, { isExpandedBySearch }) =>
            data.objectTypeField == 'procedures' || data.objectTypeField == 'functions'
              ? isExpandedBySearch
                ? SubProcedureLineList
                : SubProcedureParamList
              : isExpandedBySearch && (data.objectTypeField == 'views' || data.objectTypeField == 'matviews')
                ? SubProcedureLineList
                : SubTableColumnList}
          isExpandable={data =>
            data.objectTypeField == 'tables' ||
            data.objectTypeField == 'views' ||
            data.objectTypeField == 'matviews' ||
            ((data.objectTypeField == 'procedures' || data.objectTypeField == 'functions') &&
              !!data.parameters?.length)}
          expandIconFunc={chevronExpandIcon}
          {filter}
          passProps={{
            showPinnedInsteadOfUnpin: true,
            connection: $connection,
            hideSchemaName: !!$appliedCurrentSchema,
            searchSettings: $databaseObjectAppObjectSearchSettings,
          }}
          getIsExpanded={data =>
            expandedObjects.includes(`${data.objectTypeField}||${data.schemaName}||${data.pureName}`)}
          setIsExpanded={(data, value) => {
            expandedObjects = value
              ? [...expandedObjects, `${data.objectTypeField}||${data.schemaName}||${data.pureName}`]
              : expandedObjects.filter(x => x != `${data.objectTypeField}||${data.schemaName}||${data.pureName}`);
          }}
        />
      </AppObjectListHandler>
    {/if}
  </WidgetsInnerContainer>
{/if}
