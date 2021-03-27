<script lang="ts">
  import _ from 'lodash';
  import { writable } from 'svelte/store';
  import AppObjectList from '../appobj/AppObjectList.svelte';
  import * as databaseObjectAppObject from '../appobj/DatabaseObjectAppObject.svelte';

  import HorizontalSplitter from '../elements/HorizontalSplitter.svelte';

  import LargeButton from '../elements/LargeButton.svelte';
  import SearchBoxWrapper from '../elements/SearchBoxWrapper.svelte';
  import SearchInput from '../elements/SearchInput.svelte';
  import FormCheckboxField from '../forms/FormCheckboxField.svelte';
  import FormFieldTemplateTiny from '../forms/FormFieldTemplateTiny.svelte';
  import FormProvider from '../forms/FormProvider.svelte';
  import FormProviderCore from '../forms/FormProviderCore.svelte';
  import FormValues from '../forms/FormValues.svelte';

  import FontIcon from '../icons/FontIcon.svelte';
  import SqlEditor from '../query/SqlEditor.svelte';
  import axiosInstance from '../utility/axiosInstance';
  import { useDatabaseInfo } from '../utility/metadataLoaders';
  import WidgetColumnBar from '../widgets/WidgetColumnBar.svelte';
  import WidgetColumnBarItem from '../widgets/WidgetColumnBarItem.svelte';
  import WidgetsInnerContainer from '../widgets/WidgetsInnerContainer.svelte';

  import ModalBase from './ModalBase.svelte';
  import { closeCurrentModal } from './modalTools';

  export let conid;
  export let database;

  let busy = false;
  let managerSize;
  let objectsFilter = '';
  let sqlPreview = '';

  const checkedObjectsStore = writable([]);
  const valuesStore = writable({});

  $: console.log('checkedObjectsStore', $checkedObjectsStore);

  $: objects = useDatabaseInfo({ conid, database });

  $: generatePreview($valuesStore, $checkedObjectsStore);

  $: objectList = _.flatten(
    ['tables', 'views', 'procedures', 'functions'].map(objectTypeField =>
      _.sortBy(
        (($objects || {})[objectTypeField] || []).map(obj => ({ ...obj, objectTypeField })),
        ['schemaName', 'pureName']
      )
    )
  );

  async function generatePreview(options, objects) {
    busy = true;
    const response = await axiosInstance.post('database-connections/sql-preview', { conid, database, objects, options });
    if (_.isString(response.data)) {
      sqlPreview = response.data;
    }
    busy = false;
  }
</script>

<FormProviderCore values={valuesStore} template={FormFieldTemplateTiny}>
  <ModalBase {...$$restProps} fullScreen>
    <svelte:fragment slot="header">
      SQL Generator
      {#if busy}
        <FontIcon icon="icon loading" />
      {/if}
    </svelte:fragment>

    <HorizontalSplitter initialValue="300px" bind:size={managerSize}>
      <svelte:fragment slot="1">
        <WidgetColumnBar>
          <WidgetColumnBarItem title="Choose objects" name="objects" height="60%">
            <SearchBoxWrapper>
              <SearchInput placeholder="Search tables or objects" bind:value={objectsFilter} />
            </SearchBoxWrapper>

            <WidgetsInnerContainer>
              <AppObjectList
                list={objectList.map(x => ({ ...x, conid, database }))}
                module={databaseObjectAppObject}
                groupFunc={data => _.startCase(data.objectTypeField)}
                isExpandable={data => data.objectTypeField == 'tables' || data.objectTypeField == 'views'}
                filter={objectsFilter}
                {checkedObjectsStore}
              />
            </WidgetsInnerContainer>
          </WidgetColumnBarItem>

          <WidgetColumnBarItem title="Settings" name="settings">
            <WidgetsInnerContainer>
              <FormValues let:values>
                <FormCheckboxField label="Drop tables" name="dropTables" />
                {#if values.dropTables}
                  <div class="ml-1">
                    <FormCheckboxField label="Test if exists" name="checkIfTableExists" defaultValue={true} />
                  </div>
                {/if}
                <FormCheckboxField label="Drop references" name="dropReferences" />

                <FormCheckboxField label="Create tables" name="createTables" />
                <FormCheckboxField label="Create references" name="createReferences" />
                <FormCheckboxField label="Create foreign keys" name="createForeignKeys" />
                <FormCheckboxField label="Create indexes" name="createIndexes" />

                <FormCheckboxField label="Insert" name="insert" />
                {#if values.insert}
                  <div class="ml-1">
                    <FormCheckboxField label="Skip autoincrement column" name="skipAutoincrementColumn" />
                    <FormCheckboxField label="Disable constraints" name="disableConstraints" defaultValue={true} />
                    <FormCheckboxField label="Omit NULL values" name="omitNulls" />
                  </div>
                {/if}

                <FormCheckboxField label="Truncate tables (delete all rows)" name="truncate" />

                <!-- <HashCheckBox label='Drop' hashName={`gensql.drop${objTypePascal}`} onChange={onChange} />
          {
              getHashValue(`gensql.drop${objTypePascal}`) == '1' &&
              <HashCheckBox label='Test if exists' hashName={`gensql.checkIf${objTypePascal}Exists`} indent={1} onChange={onChange} defaultChecked />
          }
          <HashCheckBox label='Create' hashName={`gensql.create${objTypePascal}`} onChange={onChange} /> -->
              </FormValues>
            </WidgetsInnerContainer>
          </WidgetColumnBarItem>
        </WidgetColumnBar>
      </svelte:fragment>

      <svelte:fragment slot="2">
        <SqlEditor readOnly value={sqlPreview} />
      </svelte:fragment>
    </HorizontalSplitter>

    <svelte:fragment slot="footer">
      <div class="flex m-2">
        <LargeButton on:click={closeCurrentModal} icon="icon close">Close</LargeButton>
      </div>
    </svelte:fragment>
  </ModalBase>
</FormProviderCore>
