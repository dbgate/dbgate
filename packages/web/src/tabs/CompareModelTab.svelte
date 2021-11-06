<script lang="ts" context="module">
  export const matchingProps = [];

  const getCurrentEditor = () => getActiveComponent('CompareModelTab');

  registerCommand({
    id: 'compareModels.reportDiff',
    category: 'Compare models',
    toolbarName: 'Report',
    name: 'Report diff',
    icon: 'icon report',
    toolbar: true,
    isRelatedToTab: true,
    onClick: () => getCurrentEditor().showReport(),
    testEnabled: () => getCurrentEditor() != null,
  });
</script>

<script lang="ts">
  import {
    findEngineDriver,
    generateDbPairingId,
    getAlterTableScript,
    matchPairedObjects,
    computeDbDiffRows,
    computeTableDiffColumns,
    getCreateObjectScript,
  } from 'dbgate-tools';

  import _ from 'lodash';
  import { derived, writable } from 'svelte/store';
  import registerCommand from '../commands/registerCommand';
  import DiffView from '../elements/DiffView.svelte';
  import ScrollableTableControl from '../elements/ScrollableTableControl.svelte';
  import TabControl from '../elements/TabControl.svelte';
  import TableControl from '../elements/TableControl.svelte';
  import VerticalSplitter from '../elements/VerticalSplitter.svelte';
  import FormFieldTemplateTiny from '../forms/FormFieldTemplateTiny.svelte';
  import FormProviderCore from '../forms/FormProviderCore.svelte';
  import FontIcon from '../icons/FontIcon.svelte';
  import FormConnectionSelect from '../impexp/FormConnectionSelect.svelte';
  import FormDatabaseSelect from '../impexp/FormDatabaseSelect.svelte';
  import SqlEditor from '../query/SqlEditor.svelte';
  import useEditorData from '../query/useEditorData';
  import { extensions } from '../stores';
  import axiosInstance from '../utility/axiosInstance';
  import createActivator, { getActiveComponent } from '../utility/createActivator';
  import { useConnectionInfo, useDatabaseInfo } from '../utility/metadataLoaders';
  import resolveApi from '../utility/resolveApi';

  export let tabid;

  let pairIndex = 0;

  export const activator = createActivator('CompareModelTab', true);

  // let values = writable({
  //   sourceConid: null,
  //   sourceDatabase: null,
  //   targetConid: null,
  //   targetDatabase: null,
  // });

  const dbDiffOptions: any = {
    // schemaMode: 'ignore',
  };

  $: sourceDbValue = useDatabaseInfo({ conid: $values?.sourceConid, database: $values?.sourceDatabase });
  $: targetDbValue = useDatabaseInfo({ conid: $values?.targetConid, database: $values?.targetDatabase });

  $: sourceDb = generateDbPairingId($sourceDbValue);
  $: targetDb = generateDbPairingId($targetDbValue);

  $: connection = useConnectionInfo({ conid: $values?.targetConid });
  $: driver = findEngineDriver($connection, $extensions);

  $: targetDbPaired = matchPairedObjects(sourceDb, targetDb, dbDiffOptions);
  $: diffRows = computeDbDiffRows(sourceDb, targetDbPaired, dbDiffOptions, driver);
  $: diffColumns = computeTableDiffColumns(
    diffRows[pairIndex]?.source,
    diffRows[pairIndex]?.target,
    dbDiffOptions,
    driver
  );

  $: sqlPreview = getAlterTableScript(
    diffRows[pairIndex]?.source,
    diffRows[pairIndex]?.target,
    dbDiffOptions,
    targetDb,
    driver
  ).sql;

  export async function showReport() {
    const resp = await axiosInstance.post('database-connections/generate-db-diff-report', {
      sourceConid: $values?.sourceConid,
      sourceDatabase: $values?.sourceDatabase,
      targetConid: $values?.targetConid,
      targetDatabase: $values?.targetDatabase,
    });

    window.open(`${resolveApi()}/uploads/get?file=${resp.data}`, '_blank');

    // window.open(
    //   `${resolveApi()}/database-connections/get-diff-html?sourceConid=` +
    //     `${$values?.sourceConid}&sourceDatabase=${$values?.sourceDatabase}&` +
    //     `targetConid=${$values?.targetConid}&targetDatabase=${$values?.targetDatabase}`,
    //   '_blank'
    // );
  }

  const { editorState, editorValue, setEditorData } = useEditorData({
    tabid,
    // onInitialData: value => {
    //   dispatchModel({ type: 'reset', value });
    // },
  });

  const values = {
    ...editorValue,
    update: setEditorData,
    set: setEditorData,
  };
</script>

<div class="wrapper">
  <VerticalSplitter>
    <div slot="1" class="flexcol">
      <FormProviderCore {values}>
        <div class="topbar">
          <div class="col-3">
            <FormConnectionSelect
              name="sourceConid"
              label="Source server"
              templateProps={{ noMargin: true }}
              isNative
            />
          </div>
          <div class="col-3">
            <FormDatabaseSelect
              conidName="sourceConid"
              name="sourceDatabase"
              label="Source database"
              templateProps={{ noMargin: true }}
              isNative
            />
          </div>
          <div class="arrow">
            <FontIcon icon="icon arrow-right-bold" />
          </div>
          <div class="col-3">
            <FormConnectionSelect
              name="targetConid"
              label="Target server"
              templateProps={{ noMargin: true }}
              isNative
            />
          </div>
          <div class="col-3">
            <FormDatabaseSelect
              conidName="targetConid"
              name="targetDatabase"
              label="Target database"
              templateProps={{ noMargin: true }}
              isNative
            />
          </div>
        </div>
      </FormProviderCore>

      <div class="tableWrapper">
        <ScrollableTableControl
          rows={diffRows}
          bind:selectedIndex={pairIndex}
          selectable
          disableFocusOutline
          columns={[
            { fieldName: 'type', header: 'Type', width: '100px' },
            { fieldName: 'sourceSchemaName', header: 'Schema' },
            { fieldName: 'sourcePureName', header: 'Name' },
            { fieldName: 'state', header: 'Action', width: '100px' },
            { fieldName: 'targetSchemaName', header: 'Schema' },
            { fieldName: 'targetPureName', header: 'Name' },
          ]}
        />
      </div>
    </div>

    <svelte:fragment slot="2">
      <TabControl
        tabs={[
          {
            label: 'DDL',
            slot: 1,
          },
          {
            label: 'SQL script',
            slot: 2,
          },
          {
            label: 'Columns',
            slot: 3,
          },
        ]}
      >
        <svelte:fragment slot="1">
          <DiffView
            leftTitle={diffRows[pairIndex]?.source?.pureName}
            rightTitle={diffRows[pairIndex]?.source?.pureName}
            leftText={getCreateObjectScript(diffRows[pairIndex]?.source, driver)}
            rightText={getCreateObjectScript(diffRows[pairIndex]?.target, driver)}
          />
        </svelte:fragment>

        <svelte:fragment slot="2">
          <SqlEditor readOnly value={sqlPreview} />
        </svelte:fragment>

        <svelte:fragment slot="3">
          <ScrollableTableControl
            rows={diffColumns}
            disableFocusOutline
            columns={[
              { fieldName: 'sourceColumnName', header: 'Name', width: '100px' },
              { fieldName: 'sourceDataType', header: 'Type' },
              { fieldName: 'sourceNotNull', header: 'Not null', slot: 1 },
              { fieldName: 'state', header: 'Action', width: '100px' },
              { fieldName: 'targetColumnName', header: 'Schema' },
              { fieldName: 'targetDataType', header: 'Name' },
              { fieldName: 'targetNotNull', header: 'Not null', slot: 2 },
            ]}
          >
            <input type="checkbox" disabled slot="1" let:row checked={!!row.sourceNotNull} />
            <input type="checkbox" disabled slot="2" let:row checked={!!row.targetNotNull} />
          </ScrollableTableControl>
        </svelte:fragment>
      </TabControl>
    </svelte:fragment>
  </VerticalSplitter>
</div>

<style>
  .wrapper {
    overflow: auto;
    flex: 1;
  }

  .flexcol {
    flex: 1;
    display: flex;
    flex-direction: column;
  }
  .topbar {
    display: flex;
    margin: 10px 0px;
    width: 100%;
  }
  .arrow {
    font-size: 30px;
    color: var(--theme-icon-blue);
    align-self: center;
    position: relative;
    top: 10px;
  }

  .tableWrapper {
    position: relative;
    width: 100%;
    flex: 1;
  }
</style>
