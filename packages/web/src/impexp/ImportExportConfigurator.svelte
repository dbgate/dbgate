<script lang="ts" context="module">
  async function addFileToSourceListDefault({ fileName, shortName, isDownload }, newSources, newValues) {
    const sourceName = shortName;
    newSources.push(sourceName);
    newValues[`sourceFile_${sourceName}`] = {
      fileName,
      isDownload,
    };
  }

  export async function addFilesToSourceList(
    extensions,
    files,
    values,
    valuesStore,
    preferedStorageType = undefined,
    setPreviewSource = undefined
  ) {
    const newSources = [];
    const newValues = {};
    const storage = preferedStorageType || values.sourceStorageType;
    for (const file of getAsArray(files)) {
      const format = findFileFormat(extensions, storage);
      if (format) {
        await (format.addFileToSourceList || addFileToSourceListDefault)(file, newSources, newValues);
      }
    }
    newValues['sourceList'] = [...(values.sourceList || []).filter(x => !newSources.includes(x)), ...newSources];
    if (preferedStorageType && preferedStorageType != values.sourceStorageType) {
      newValues['sourceStorageType'] = preferedStorageType;
    }
    valuesStore.set({
      ...values,
      ...newValues,
    });
    if (setPreviewSource && newSources.length == 1) {
      setPreviewSource(newSources[0]);
    }
  }
</script>

<script lang="ts">
  import { onMount } from 'svelte';
  import { writable } from 'svelte/store';
  import TableControl from '../elements/TableControl.svelte';
  import { getFormContext } from '../forms/FormProviderCore.svelte';
  import FontIcon from '../icons/FontIcon.svelte';
  import { findFileFormat } from '../plugins/fileformats';
  import { extensions } from '../stores';
  import getAsArray from '../utility/getAsArray';
  import { useConnectionInfo, useDatabaseInfo } from '../utility/metadataLoaders';
  import { setUploadListener } from '../utility/uploadFiles';
  import PreviewCheckBox from './PreviewCheckBox.svelte';
  import SourceAction from './SourceAction.svelte';
  import SourceName from './SourceName.svelte';

  import SourceTargetConfig from './SourceTargetConfig.svelte';
  import TargetName from './TargetName.svelte';

  export let uploadedFile = undefined;
  export let openedFile = undefined;

  const { values } = getFormContext();

  $: targetDbinfo = useDatabaseInfo({ conid: $values.targetConnectionId, database: $values.targetDatabaseName });
  $: sourceConnectionInfo = useConnectionInfo({ conid: $values.sourceConnectionId });
  $: sourceList = $values.sourceList;

  const previewSource = writable(null);

  const handleUpload = file => {
    addFilesToSourceList(
      $extensions,
      [
        {
          fileName: file.filePath,
          shortName: file.shortName,
        },
      ],
      $values,
      values,
      !sourceList || sourceList.length == 0 ? file.storageType : null,
      previewSource.set
    );
    // setFieldValue('sourceList', [...(sourceList || []), file.originalName]);
  };

  onMount(() => {
    setUploadListener(handleUpload);
    if (uploadedFile) {
      handleUpload(uploadedFile);
    }
    if (openedFile) {
      handleUpload(openedFile);
      // addFilesToSourceList(
      //   $extensions,
      //   [
      //     {
      //       fileName: openedFile.filePath,
      //       shortName: openedFile.shortName,
      //     },
      //   ],
      //   $values,
      //   values,
      //   !sourceList || sourceList.length == 0 ? openedFile.storageType : null,
      //   previewSource.set
      // );
    }

    return () => {
      setUploadListener(null);
    };
  });
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
      setPreviewSource={previewSource.set}
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
