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
        await (format.addFileToSourceList || addFileToSourceListDefault)(file, newSources, newValues, apiCall);
      }
    }
    newValues['sourceList'] = [...(values.sourceList || []).filter(x => !newSources.includes(x)), ...newSources];
    if (preferedStorageType && preferedStorageType != values.sourceStorageType) {
      newValues['sourceStorageType'] = preferedStorageType;
    }
    for (const source of newSources) {
      if (values.fixedTargetPureName) {
        values[`targetName_${source}`] = values.fixedTargetPureName;
        values[`actionType_${source}`] = 'appendData';
      }
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
  import Link from '../elements/Link.svelte';
  import TableControl from '../elements/TableControl.svelte';
  import CheckboxField from '../forms/CheckboxField.svelte';
  import { getFormContext } from '../forms/FormProviderCore.svelte';
  import TextField from '../forms/TextField.svelte';
  import FontIcon from '../icons/FontIcon.svelte';
  import ColumnMapModal from '../modals/ColumnMapModal.svelte';
  import { showModal } from '../modals/modalTools';
  import { findFileFormat } from '../plugins/fileformats';
  import { extensions } from '../stores';
  import { apiCall } from '../utility/api';
  import getAsArray from '../utility/getAsArray';
  import { useConnectionInfo, useDatabaseInfo } from '../utility/metadataLoaders';
  import { setUploadListener } from '../utility/uploadFiles';
  import { createPreviewReader, getTargetName } from './createImpExpScript';
  import SourceAction from './SourceAction.svelte';
  import SourceName from './SourceName.svelte';

  import SourceTargetConfig from './SourceTargetConfig.svelte';

  export let uploadedFile = undefined;
  export let openedFile = undefined;
  export let previewReaderStore;

  const { values, setFieldValue } = getFormContext();

  $: targetDbinfo = useDatabaseInfo({ conid: $values.targetConnectionId, database: $values.targetDatabaseName });
  $: sourceConnectionInfo = useConnectionInfo({ conid: $values.sourceConnectionId });
  $: sourceEngine = $sourceConnectionInfo?.engine;
  $: sourceList = $values.sourceList;

  const previewSource = writable(null);

  $: supportsPreview =
    !!findFileFormat($extensions, $values.sourceStorageType) || $values.sourceStorageType == 'archive';

  $: {
    $values;
    handleChangePreviewSource($previewSource);
  }

  const handleChangePreviewSource = async source => {
    if (source && supportsPreview) {
      const reader = await createPreviewReader($extensions, $values, source);
      if (previewReaderStore) previewReaderStore.set(reader);
    } else {
      if (previewReaderStore) previewReaderStore.set(null);
    }
  };

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
      engine={sourceEngine}
      setPreviewSource={previewSource.set}
    />
    <div class="arrow">
      <FontIcon icon="icon arrow-right-bold" />
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
          slot: 1,
        },
        {
          fieldName: 'preview',
          header: 'Preview',
          slot: 0,
        },
        {
          fieldName: 'columns',
          header: 'Columns',
          slot: 2,
        },
      ]}
    >
      <svelte:fragment slot="0" let:row>
        {#if supportsPreview}
          <CheckboxField
            checked={$previewSource == row}
            on:change={e => {
              // @ts-ignore
              if (e.target.checked) $previewSource = row;
              else $previewSource = null;
            }}
          />
        {/if}
      </svelte:fragment>
      <svelte:fragment slot="1" let:row>
        <TextField
          value={getTargetName($extensions, row, $values)}
          on:input={e =>
            setFieldValue(
              `targetName_${row}`,
              // @ts-ignore
              e.target.value
            )}
        />
      </svelte:fragment>
      <svelte:fragment slot="2" let:row>
        {@const columnCount = ($values[`columns_${row}`] || []).filter(x => !x.skip).length}
        <Link
          onClick={() => {
            showModal(ColumnMapModal, {
              value: $values[`columns_${row}`],
              onConfirm: value => setFieldValue(`columns_${row}`, value),
            });
          }}
          >{columnCount > 0 ? `(${columnCount} columns)` : '(copy from source)'}
        </Link>
      </svelte:fragment>
    </TableControl>
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
