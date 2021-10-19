<script lang="ts" context="module">
  export const matchingProps = [];
</script>

<script lang="ts">
  import { findEngineDriver, matchPairedObjects } from 'dbgate-tools';

  import _ from 'lodash';
  import { writable } from 'svelte/store';
  import TableControl from '../elements/TableControl.svelte';
  import FormProviderCore from '../forms/FormProviderCore.svelte';
  import FontIcon from '../icons/FontIcon.svelte';
  import FormConnectionSelect from '../impexp/FormConnectionSelect.svelte';
  import FormDatabaseSelect from '../impexp/FormDatabaseSelect.svelte';
import useEditorData from '../query/useEditorData';
  import { extensions } from '../stores';
  import { computeDiffRows } from '../utility/computeDiffRows';
  import { useConnectionInfo, useDatabaseInfo } from '../utility/metadataLoaders';

  export let tabid;

  let values = writable({
    sourceConid: null,
    sourceDatabase: null,
    targetConid: null,
    targetDatabase: null,
  });

  const dbDiffOptions: any = {
    ignoreCase: true,
    schemaMode: 'ignore',
    ignoreConstraintNames: true,

    noDropTable: true,
    noDropColumn: true,
    noDropConstraint: true,
    noDropSqlObject: true,
    noRenameTable: true,
    noRenameColumn: true,
    ignoreForeignKeyActions: true,
    ignoreDataTypes: true,
  };

  $: sourceDb = useDatabaseInfo({ conid: $values.sourceConid, database: $values.sourceDatabase });
  $: targetDb = useDatabaseInfo({ conid: $values.targetConid, database: $values.targetDatabase });

  $: connection = useConnectionInfo({ conid: $values.targetConid });
  $: driver = findEngineDriver($connection, $extensions);

  $: targetDbPaired = matchPairedObjects($sourceDb, $targetDb, dbDiffOptions);
  $: diffRows = computeDiffRows($sourceDb, targetDbPaired, dbDiffOptions, driver);

  const { editorState, editorValue, setEditorData } = useEditorData({
    tabid,
    // onInitialData: value => {
    //   dispatchModel({ type: 'reset', value });
    // },
  });

</script>

<div class="wrapper">
  <FormProviderCore {values}>
    <div class="flex">
      <div class="col-3">
        <FormConnectionSelect name="sourceConid" label="Server" />
      </div>
      <div class="col-3">
        <FormDatabaseSelect conidName="sourceConid" name="sourceDatabase" label="Database" />
      </div>
      <div class="arrow">
        <FontIcon icon="icon arrow-right-bold" />
      </div>
      <div class="col-3">
        <FormConnectionSelect name="targetConid" label="Target" />
      </div>
      <div class="col-3">
        <FormDatabaseSelect conidName="targetConid" name="targetDatabase" label="Database" />
      </div>
    </div>
  </FormProviderCore>

  <TableControl
    rows={diffRows}
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

<style>
  .wrapper {
    overflow: auto;
    flex: 1;
  }
  .arrow {
    font-size: 30px;
    color: var(--theme-icon-blue);
    align-self: center;
  }
</style>
