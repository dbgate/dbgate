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
    const templateTarget = values['targetName___TEMPLATE__'];
    newValues['sourceList'] = [
      ...(values.sourceList || []).filter(x => !newSources.includes(x) && x != '__TEMPLATE__'),
      ...newSources,
    ];
    if (preferedStorageType && preferedStorageType != values.sourceStorageType) {
      newValues['sourceStorageType'] = preferedStorageType;
    }
    if (templateTarget) {
      const source = newSources[0];
      if (source) {
        newValues[`targetName_${source}`] = templateTarget;
      }
    }
    const newValuesAll = {
      ...values,
      ...newValues,
    };
    delete newValuesAll['targetName___TEMPLATE__'];
    valuesStore.set(newValuesAll);
    if (setPreviewSource && newSources.length == 1) {
      setPreviewSource(newSources[0]);
    }
  }
</script>

<script lang="ts">
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
  import useEffect from '../utility/useEffect';
  import { compositeDbNameIfNeeded } from 'dbgate-tools';
  import createRef from '../utility/createRef';
  import DropDownButton from '../buttons/DropDownButton.svelte';
  import ErrorMessageModal from '../modals/ErrorMessageModal.svelte';

  // export let uploadedFile = undefined;
  // export let openedFile = undefined;
  export let previewReaderStore;
  export let isTabActive;
  export let isRunning = false;

  const { values, setFieldValue } = getFormContext();

  // $: console.log('VALUES', $values);
  // $: console.log('$sourceDbinfo', $sourceDbinfo);
  // $: console.log('$targetDbinfo', $targetDbinfo);

  $: sourceConnectionInfo = useConnectionInfo({ conid: $values.sourceConnectionId });
  $: targetConnectionInfo = useConnectionInfo({ conid: $values.targetConnectionId });

  $: sourceDbinfo = useDatabaseInfo({
    conid: $values.sourceConnectionId,
    database: compositeDbNameIfNeeded($sourceConnectionInfo, $values.sourceDatabaseName, $values.sourceSchemaName),
  });
  $: targetDbinfo = useDatabaseInfo({
    conid: $values.targetConnectionId,
    database: compositeDbNameIfNeeded($targetConnectionInfo, $values.targetDatabaseName, $values.targetSchemaName),
  });

  $: sourceEngine = $sourceConnectionInfo?.engine;
  $: sourceList = $values.sourceList;

  let targetEditKey = 0;
  export let progressHolder = null;

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

  export function addUploadedFile(file) {
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
    targetEditKey += 1;
  }

  $: effectActiveTab = useEffect(() => {
    if (isTabActive) {
      setUploadListener(addUploadedFile);
      return () => {
        setUploadListener(null);
      };
    } else {
      return () => {};
    }
  });

  // const lastSourcesRef = createRef(null);
  // function setFixedTargetForNewSources(values, valuesStore) {
  //   if (lastSourcesRef.get() && values.fixedTargetPureName) {
  //     const newSources = values.sourceList.filter(x => !lastSourcesRef.get()?.includes(x));
  //     const newValues = {};
  //     for (const source of newSources) {
  //       if (values.fixedTargetPureName) {
  //         if (!values[`targetName_${source}`]) {
  //           newValues[`targetName_${source}`] = values.fixedTargetPureName;
  //         }
  //         if (!values[`actionType_${source}`]) {
  //           newValues[`actionType_${source}`] = 'appendData';
  //         }
  //       }
  //     }
  //     valuesStore.set({
  //       ...values,
  //       ...newValues,
  //     });
  //   }
  //   lastSourcesRef.set(values.sourceList);
  // }

  // $: setFixedTargetForNewSources($values, values);

  $effectActiveTab;
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

    {#key targetEditKey}
      {#key progressHolder}
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
            supportsPreview && {
              fieldName: 'preview',
              header: 'Preview',
              slot: 0,
            },
            !!progressHolder && {
              fieldName: 'status',
              header: 'Status',
              slot: 3,
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
            <div class="flex">
              <TextField
                value={getTargetName($extensions, row, $values)}
                on:input={e =>
                  setFieldValue(
                    `targetName_${row}`,
                    // @ts-ignore
                    e.target.value
                  )}
                data-testid={`ImportExportConfigurator_targetName_${row}`}
              />
              {#if $targetDbinfo}
                <DropDownButton
                  menu={() => {
                    return $targetDbinfo.tables.map(opt => ({
                      text: opt.pureName,
                      onClick: () => {
                        setFieldValue(`targetName_${row}`, opt.pureName);
                        targetEditKey += 1;
                      },
                    }));
                  }}
                />
              {/if}
            </div>
          </svelte:fragment>
          <svelte:fragment slot="2" let:row>
            {@const columnCount = ($values[`columns_${row}`] || []).filter(x => !x.skip).length}
            <Link
              onClick={() => {
                const targetNameLower = ($values[`targetName_${row}`] || row)?.toLowerCase();
                showModal(ColumnMapModal, {
                  initialValue: $values[`columns_${row}`],
                  sourceTableInfo: $sourceDbinfo?.tables?.find(x => x.pureName?.toLowerCase() == row?.toLowerCase()),
                  targetTableInfo: $targetDbinfo?.tables?.find(x => x.pureName?.toLowerCase() == targetNameLower),
                  onConfirm: value => setFieldValue(`columns_${row}`, value),
                });
              }}
              >{columnCount > 0 ? `(${columnCount} columns)` : '(copy from source)'}
            </Link>
          </svelte:fragment>
          <svelte:fragment slot="3" let:row>
            {#if progressHolder[row]?.status == 'running' && isRunning}
              <FontIcon icon="icon loading" />
              {#if progressHolder[row]?.writtenRowCount}
                {progressHolder[row]?.writtenRowCount} rows writtem
              {:else if progressHolder[row]?.readRowCount}
                {progressHolder[row]?.readRowCount} rows read
              {:else}
                Running
              {/if}
            {:else if progressHolder[row]?.status == 'error'}
              <FontIcon icon="img error" /> Error
              {#if progressHolder[row]?.errorMessage}
                <FontIcon
                  icon="img info"
                  title={progressHolder[row]?.errorMessage}
                  on:click={() => showModal(ErrorMessageModal, { message: progressHolder[row]?.errorMessage })}
                  style="cursor: pointer"
                  data-testid={`ImportExportConfigurator_errorInfoIcon_${row}`}
                />
              {/if}
            {:else if progressHolder[row]?.status == 'done'}
              <FontIcon icon="img ok" />
              {#if progressHolder[row]?.writtenRowCount}
                {progressHolder[row]?.writtenRowCount} rows written
              {:else if progressHolder[row]?.readRowCount}
                {progressHolder[row]?.readRowCount} rows written
              {:else}
                Done
              {/if}
            {:else}
              <FontIcon icon="icon wait" />
              {#if progressHolder[row]?.writtenRowCount}
                {progressHolder[row]?.writtenRowCount} rows writtem
              {:else if progressHolder[row]?.readRowCount}
                {progressHolder[row]?.readRowCount} rows read
              {:else}
                Queued
              {/if}
            {/if}
          </svelte:fragment>
        </TableControl>
      {/key}
    {/key}
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
