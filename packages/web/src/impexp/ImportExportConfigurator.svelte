<script lang="ts">
  import { writable } from 'svelte/store';

  import TableControl from '../elements/TableControl.svelte';
  import { getFormContext } from '../forms/FormProviderCore.svelte';

  import FontIcon from '../icons/FontIcon.svelte';
  import { useConnectionInfo, useDatabaseInfo } from '../utility/metadataLoaders';
  import PreviewCheckBox from './PreviewCheckBox.svelte';
  import SourceAction from './SourceAction.svelte';
  import SourceName from './SourceName.svelte';

  import SourceTargetConfig from './SourceTargetConfig.svelte';
  import TargetName from './TargetName.svelte';

  const { values } = getFormContext();

  $: targetDbinfo = useDatabaseInfo({ conid: $values.targetConnectionId, database: $values.targetDatabaseName });
  $: sourceConnectionInfo = useConnectionInfo({ conid: $values.sourceConnectionId });

  const previewSource = writable(null);

  //   engine={sourceEngine}
  //       {setPreviewSource}
</script>

<div class="flex1">
  <div class="flex">
    <SourceTargetConfig
      direction="source"
      storageTypeField="sourceStorageType"
      connectionIdField="sourceConnectionId"
      databaseNameField="sourceDatabaseName"
      archiveFolderField="sourceArchiveFolder"
      schemaNameField="sourceSchemaName"
      tablesField="sourceList"
    />
    <div class="arrow">
      <FontIcon icon="icon arrow-right" />
    </div>
    <SourceTargetConfig
      direction="target"
      storageTypeField="targetStorageType"
      connectionIdField="targetConnectionId"
      databaseNameField="targetDatabaseName"
      archiveFolderField="targetArchiveFolder"
      schemaNameField="targetSchemaName"
    />
  </div>

  <div class="m-2">
    <div class="title"><FontIcon icon="icon tables" /> Map source tables/files</div>

    <TableControl
      rows={$values.sourceList || []}
      columns={[
        {
          fieldName: 'source',
          header: 'Source',
          component: SourceName,
          getProps: row => ({ name: row }),
        },
        {
          fieldName: 'action',
          header: 'Action',
          component: SourceAction,
          getProps: row => ({ name: row, targetDbinfo }),
        },
        {
          fieldName: 'target',
          header: 'Target',
          component: TargetName,
          getProps: row => ({ name: row }),
        },
        {
          fieldName: 'preview',
          header: 'Preview',
          component: PreviewCheckBox,
          getProps: row => ({ name: row, previewSource }),
        },
      ]}
    />
  </div>
</div>

<style>
  .arrow {
    font-size: 30px;
    color: var(--theme-icon-blue);
    align-self: center;
  }

  .title {
    font-size: 20px;
    text-align: center;
    margin: 10px 0px;
  }
</style>
