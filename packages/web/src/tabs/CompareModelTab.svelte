<script lang="ts" context="module">
  export const matchingProps = [];
</script>

<script lang="ts">
  import { findEngineDriver, generateDbPairingId, getAlterTableScript, matchPairedObjects } from 'dbgate-tools';

  import _ from 'lodash';
  import { derived, writable } from 'svelte/store';
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
  import { computeDiffRows } from '../utility/computeDiffRows';
  import { useConnectionInfo, useDatabaseInfo } from '../utility/metadataLoaders';

  export let tabid;

  let pairIndex = 0;

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
  $: diffRows = computeDiffRows(sourceDb, targetDbPaired, dbDiffOptions, driver);

  $: sqlPreview = getAlterTableScript(
    diffRows[pairIndex]?.source,
    diffRows[pairIndex]?.target,
    dbDiffOptions,
    targetDb,
    driver
  ).sql;

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
        <TableControl
          rows={diffRows}
          bind:selectedIndex={pairIndex}
          selectable
          disableFocusOutline
          columns={[
            { fieldName: 'type', header: 'Type' },
            { fieldName: 'sourceSchemaName', header: 'Schema' },
            { fieldName: 'sourcePureName', header: 'Name' },
            { fieldName: 'state', header: 'Action' },
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
            label: 'SQL script',
            slot: 1,
          },
          {
            label: 'Columns',
            slot: 2,
          },
        ]}
      >
        <svelte:fragment slot="1">
          <SqlEditor readOnly value={sqlPreview} />
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
    overflow-y: scroll;
    width: 100%;
    flex: 1;
  }
</style>
