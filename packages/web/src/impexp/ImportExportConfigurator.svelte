<script lang="ts">
  import FontIcon from '../icons/FontIcon.svelte';

  import SourceTargetConfig from './SourceTargetConfig.svelte';

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
</div>

<style>
  .arrow {
    font-size: 30px;
    color: var(--theme-icon-blue);
    align-self: center;
  }
</style>
