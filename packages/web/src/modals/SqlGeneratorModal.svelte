<script lang="ts">
  import _ from 'lodash';
  import { writable } from 'svelte/store';
  import AppObjectList from '../appobj/AppObjectList.svelte';
  import * as databaseObjectAppObject from '../appobj/DatabaseObjectAppObject.svelte';
  import uuidv1 from 'uuid/v1';

  import HorizontalSplitter from '../elements/HorizontalSplitter.svelte';

  import LargeButton from '../buttons/LargeButton.svelte';
  import SearchBoxWrapper from '../elements/SearchBoxWrapper.svelte';
  import SearchInput from '../elements/SearchInput.svelte';
  import FormCheckboxField from '../forms/FormCheckboxField.svelte';
  import FormFieldTemplateTiny from '../forms/FormFieldTemplateTiny.svelte';
  import FormProvider from '../forms/FormProvider.svelte';
  import FormProviderCore from '../forms/FormProviderCore.svelte';
  import FormValues from '../forms/FormValues.svelte';

  import FontIcon from '../icons/FontIcon.svelte';
  import SqlEditor from '../query/SqlEditor.svelte';
  import createRef from '../utility/createRef';
  import { useDatabaseInfo } from '../utility/metadataLoaders';
  import WidgetColumnBar from '../widgets/WidgetColumnBar.svelte';
  import WidgetColumnBarItem from '../widgets/WidgetColumnBarItem.svelte';
  import WidgetsInnerContainer from '../widgets/WidgetsInnerContainer.svelte';

  import ModalBase from './ModalBase.svelte';
  import { closeCurrentModal } from './modalTools';
  import WidgetTitle from '../widgets/WidgetTitle.svelte';
  import openNewTab from '../utility/openNewTab';
  import ErrorInfo from '../elements/ErrorInfo.svelte';
  import LoadingInfo from '../elements/LoadingInfo.svelte';
  import { getObjectTypeFieldLabel } from '../utility/common';
  import { apiCall } from '../utility/api';
  import { _t } from '../translations';

  export let conid;
  export let database;

  export let initialConfig = {
    checkIfTableExists: true,
    disableConstraints: true,
    createTables: true,
    createForeignKeys: true,
    createViews: true,
    createMatviews: true,
    createProcedures: true,
    createFunctions: true,
    createTriggers: true,
  };

  export let initialObjects = null;

  let busy = false;
  let managerSize;
  let objectsFilter = '';
  let sqlPreview = '';
  let initialized = false;
  let error = null;
  let truncated = false;

  $: dbinfo = useDatabaseInfo({ conid, database });

  const checkedObjectsStore = writable(initialObjects || ($dbinfo && $dbinfo.tables) || []);
  const valuesStore = writable(initialConfig);
  const loadRef = createRef(null);

  // $: console.log('checkedObjectsStore', $checkedObjectsStore);

  $: if ($dbinfo && !initialized && !initialObjects) {
    initialized = true;
    $checkedObjectsStore = $dbinfo.tables;
  }

  $: generatePreview($valuesStore, $checkedObjectsStore);

  $: objectList = _.flatten(
    ['tables', 'views', 'matviews', 'procedures', 'functions', 'triggers', 'schedulerEvents'].map(objectTypeField =>
      _.sortBy(
        (($dbinfo || {})[objectTypeField] || []).map(obj => ({ ...obj, objectTypeField })),
        ['schemaName', 'pureName']
      )
    )
  );

  async function generatePreview(options, objects) {
    const loadid = uuidv1();
    loadRef.set(loadid);
    busy = true;
    const response = await apiCall('database-connections/sql-preview', {
      conid,
      database,
      objects,
      options,
    });
    if (loadRef.get() != loadid) {
      // newer load exists
      return;
    }
    const { sql, isTruncated, isError, errorMessage } = response || {};

    truncated = isTruncated;
    if (isError) {
      error = errorMessage || 'Unknown error';
    } else {
      error = null;
      if (_.isString(sql)) {
        sqlPreview = sql;
      }
    }
    busy = false;
  }

  function editSql() {
    openNewTab(
      {
        title: _t('query.queryNumber', { defaultMessage: 'Query #' }),
        icon: 'img sql-file',
        tabComponent: 'QueryTab',
        focused: true,
        props: {
          conid,
          database,
        },
      },
      {
        editor: sqlPreview,
      }
    );
    closeCurrentModal();
  }
</script>

<FormProviderCore values={valuesStore} template={FormFieldTemplateTiny}>
  <ModalBase {...$$restProps} fullScreen>
    <svelte:fragment slot="header">
      {_t('sqlGenerator.sqlGenerator', { defaultMessage: 'SQL Generator' })}
      <span class="dbname">
        <FontIcon icon="icon database" />
        {database}
      </span>
      {#if busy}
        <FontIcon icon="icon loading" />
      {/if}
    </svelte:fragment>

    <HorizontalSplitter initialValue="300px" bind:size={managerSize}>
      <svelte:fragment slot="1">
        <div class="flexcol flex1">
          <WidgetTitle>{_t('sqlGenerator.chooseObjects', { defaultMessage: 'Choose objects' })}</WidgetTitle>
          <SearchBoxWrapper>
            <SearchInput placeholder={_t('sqlGenerator.searchTablesOrObjects', { defaultMessage: 'Search tables or objects' })} bind:value={objectsFilter} />
          </SearchBoxWrapper>

          <WidgetsInnerContainer>
            <AppObjectList
              list={objectList.map(x => ({ ...x, conid, database }))}
              module={databaseObjectAppObject}
              groupFunc={data => getObjectTypeFieldLabel(data.objectTypeField)}
              isExpandable={data => data.objectTypeField == 'tables' || data.objectTypeField == 'views'}
              filter={objectsFilter}
              disableContextMenu
              {checkedObjectsStore}
              passProps={{ ingorePin: true }}
            />
          </WidgetsInnerContainer>
        </div>
      </svelte:fragment>

      <svelte:fragment slot="2">
        <HorizontalSplitter initialValue="~300px">
          <svelte:fragment slot="1">
            {#if error}
              <ErrorInfo message={error} />
            {:else}
              <div class="flexcol flex1">
                {#if truncated}
                  <ErrorInfo icon="img warn" message={_t('sqlGenerator.sqlTruncated', { defaultMessage: 'SQL truncated, file size limit exceed' })} />
                {/if}
                <div class="relative flex1">
                  <SqlEditor readOnly value={sqlPreview} />
                </div>
              </div>
              {#if busy}
                <LoadingInfo wrapper message={_t('sqlGenerator.loadingSqlPreview', { defaultMessage: "Loading SQL preview" })} />
              {/if}
            {/if}
          </svelte:fragment>
          <svelte:fragment slot="2">
            <div class="flexcol flex1">
              <WidgetTitle>{_t('sqlGenerator.generatorSettings', { defaultMessage: 'Generator settings' })}</WidgetTitle>
              <WidgetsInnerContainer>
                <FormValues let:values>
                  <div class="obj-heading">{_t('sqlGenerator.tables', { defaultMessage: 'Tables' })}</div>
                  <FormCheckboxField label={_t('sqlGenerator.dropTables', { defaultMessage: 'Drop tables' })} name="dropTables" />
                  {#if values.dropTables}
                    <div class="ml-2">
                      <FormCheckboxField label={_t('sqlGenerator.testIfExists', { defaultMessage: 'Test if exists' })} name="checkIfTableExists" />
                    </div>
                  {/if}
                  <FormCheckboxField label={_t('sqlGenerator.dropReferences', { defaultMessage: 'Drop references' })} name="dropReferences" />

                  <FormCheckboxField label={_t('sqlGenerator.createTables', { defaultMessage: 'Create tables' })} name="createTables" />
                  <FormCheckboxField label={_t('sqlGenerator.createReferences', { defaultMessage: 'Create references' })} name="createReferences" />
                  <FormCheckboxField label={_t('sqlGenerator.createForeignKeys', { defaultMessage: 'Create foreign keys' })} name="createForeignKeys" />
                  <FormCheckboxField label={_t('sqlGenerator.createIndexes', { defaultMessage: 'Create indexes' })} name="createIndexes" />

                  <FormCheckboxField label={_t('sqlGenerator.insert', { defaultMessage: 'Insert' })} name="insert" />
                  {#if values.insert}
                    <div class="ml-2">
                      <FormCheckboxField label={_t('sqlGenerator.skipAutoincrementColumn', { defaultMessage: 'Skip autoincrement column' })} name="skipAutoincrementColumn" />
                      <FormCheckboxField label={_t('sqlGenerator.disableConstraints', { defaultMessage: 'Disable constraints' })} name="disableConstraints" />
                      <FormCheckboxField label={_t('sqlGenerator.omitNulls', { defaultMessage: 'Omit NULL values' })} name="omitNulls" />
                    </div>
                  {/if}

                  <FormCheckboxField label={_t('sqlGenerator.truncate', { defaultMessage: 'Truncate tables (delete all rows)' })} name="truncate" />
                  {#each ['View', 'Matview', 'Procedure', 'Function', 'Trigger', 'SchedulerEvent'] as objtype}
                    <div class="obj-heading">{getObjectTypeFieldLabel(objtype + 's')}</div>
                    <FormCheckboxField label={_t('sqlGenerator.create', { defaultMessage: 'Create {objtype}s', values: {objtype} })} name={`create${objtype}s`} />
                    <FormCheckboxField label={_t('sqlGenerator.drop', { defaultMessage: `Drop ${objtype}s` })} name={`drop${objtype}s`} />
                    {#if values[`drop${objtype}s`]}
                      <div class="ml-2">
                        <FormCheckboxField label={_t('sqlGenerator.checkIfExists', { defaultMessage: 'Check if exists' })} name={`checkIf${objtype}Exists`} />
                      </div>
                    {/if}
                  {/each}
                  <!-- <HashCheckBox label='Drop' hashName={`gensql.drop${objTypePascal}`} onChange={onChange} />
          {
              getHashValue(`gensql.drop${objTypePascal}`) == '1' &&
              <HashCheckBox label='Test if exists' hashName={`gensql.checkIf${objTypePascal}Exists`} indent={1} onChange={onChange} defaultChecked />
          }
          <HashCheckBox label='Create' hashName={`gensql.create${objTypePascal}`} onChange={onChange} /> -->
                </FormValues>
              </WidgetsInnerContainer>
            </div>
          </svelte:fragment>
        </HorizontalSplitter>
      </svelte:fragment>
    </HorizontalSplitter>

    <svelte:fragment slot="footer">
      <div class="flex m-2">
        <LargeButton on:click={editSql} icon="icon sql-file">{_t('sqlGenerator.editSql', { defaultMessage: 'Edit SQL' })}</LargeButton>
        <LargeButton on:click={closeCurrentModal} icon="icon close">{_t('common.close', { defaultMessage: 'Close' })}</LargeButton>
      </div>
    </svelte:fragment>
  </ModalBase>
</FormProviderCore>

<style>
  .obj-heading {
    font-size: 20px;
    margin: 5px;
    margin-top: 20px;
  }

  .dbname {
    color: var(--theme-font-3);
  }
</style>
