<script lang="ts">
  import _ from 'lodash';
  import FormStyledButton from '../buttons/FormStyledButton.svelte';
  import FormArchiveFilesSelect from '../forms/FormArchiveFilesSelect.svelte';
  import moment from 'moment';

  import FormArchiveFolderSelect from '../forms/FormArchiveFolderSelect.svelte';
  import FormArgumentList from '../forms/FormArgumentList.svelte';

  import { getFormContext } from '../forms/FormProviderCore.svelte';
  import FormSelectField from '../forms/FormSelectField.svelte';

  import FontIcon from '../icons/FontIcon.svelte';
  import { findFileFormat, getFileFormatDirections } from '../plugins/fileformats';
  import SqlEditor from '../query/SqlEditor.svelte';
  import { currentArchive, currentDatabase, extensions } from '../stores';
  import { useConnectionInfo } from '../utility/metadataLoaders';
  import FilesInput from './FilesInput.svelte';
  import FormConnectionSelect from './FormConnectionSelect.svelte';
  import FormDatabaseSelect from './FormDatabaseSelect.svelte';
  import FormSchemaSelect from './FormSchemaSelect.svelte';
  import FormTablesSelect from './FormTablesSelect.svelte';
  import { findEngineDriver } from 'dbgate-tools';
  import AceEditor from '../query/AceEditor.svelte';
  import { _t } from '../translations';

  export let direction;
  export let storageTypeField;

  export let connectionIdField;
  export let databaseNameField;
  export let archiveFolderField;
  export let schemaNameField;
  export let tablesField = undefined;
  export let engine = undefined;
  export let setPreviewSource = undefined;

  const { values, setFieldValue } = getFormContext();

  $: types =
    $values[storageTypeField] == 'jsldata'
      ? [{ value: 'jsldata', label: 'Query result data', directions: ['source'] }]
      : [
          {
            value: 'database',
            label: _t('common.database', { defaultMessage: 'Database' }),
            directions: ['source', 'target'],
          },
          ...$extensions.fileFormats.map(format => ({
            value: format.storageType,
            label: `${format.name} files(s)`,
            directions: getFileFormatDirections(format),
          })),
          { value: 'query', label: _t('common.query', { defaultMessage: 'Query' }), directions: ['source'] },
          {
            value: 'archive',
            label: _t('common.archive', { defaultMessage: 'Archive' }),
            directions: ['source', 'target'],
          },
        ];

  $: storageType = $values[storageTypeField];
  $: format = findFileFormat($extensions, storageType);
  $: connectionInfo = useConnectionInfo({ conid: $values[connectionIdField] });
  $: driver = findEngineDriver($connectionInfo, $extensions);
</script>

<div class="column">
  {#if direction == 'source'}
    <div class="title">
      <FontIcon icon="icon import" /> Source configuration
    </div>
  {/if}
  {#if direction == 'target'}
    <div class="title">
      <FontIcon icon="icon export" /> Target configuration
    </div>
  {/if}

  <div class="buttons">
    {#if $currentDatabase}
      <FormStyledButton
        value="Current DB"
        on:click={() => {
          values.update(x => ({
            ...x,
            [storageTypeField]: 'database',
            [connectionIdField]: $currentDatabase?.connection?._id,
            [databaseNameField]: $currentDatabase?.name,
          }));
        }}
      />
    {/if}
    <FormStyledButton
      value="Current archive"
      data-testid={direction == 'source'
        ? 'SourceTargetConfig_buttonCurrentArchive_source'
        : 'SourceTargetConfig_buttonCurrentArchive_target'}
      on:click={() => {
        values.update(x => ({
          ...x,
          [storageTypeField]: 'archive',
          [archiveFolderField]: $currentArchive,
        }));
      }}
    />
    {#if direction == 'target'}
      <FormStyledButton
        value="New archive"
        on:click={() => {
          values.update(x => ({
            ...x,
            [storageTypeField]: 'archive',
            [archiveFolderField]: `import-${moment().format('YYYY-MM-DD-hh-mm-ss')}`,
          }));
        }}
      />
    {/if}
  </div>

  <FormSelectField
    options={types.filter(x => x.directions.includes(direction))}
    name={storageTypeField}
    label="Storage type"
  />

  {#if storageType == 'database' || storageType == 'query'}
    <FormConnectionSelect name={connectionIdField} label="Server" {direction} />
    <FormDatabaseSelect conidName={connectionIdField} name={databaseNameField} label="Database" />
  {/if}
  {#if storageType == 'database'}
    <FormSchemaSelect
      conidName={connectionIdField}
      databaseName={databaseNameField}
      name={schemaNameField}
      label={_t('common.schema', { defaultMessage: 'Schema' })}
    />
    {#if tablesField}
      <FormTablesSelect
        conidName={connectionIdField}
        schemaName={schemaNameField}
        databaseName={databaseNameField}
        name={tablesField}
        label={_t('importExport.tablesViewsCollections', { defaultMessage: 'Tables / views / collections' })}
      />
    {/if}
  {/if}
  {#if storageType == 'query'}
    <div class="label">{_t('common.query', { defaultMessage: 'Query' })}</div>
    <div class="sqlwrap">
      {#if $values.sourceQueryType == 'json'}
        <AceEditor value={$values.sourceQuery} on:input={e => setFieldValue('sourceQuery', e.detail)} mode="json" />
      {:else}
        <SqlEditor value={$values.sourceQuery} on:input={e => setFieldValue('sourceQuery', e.detail)} {engine} />
      {/if}
    </div>
  {/if}

  {#if storageType == 'archive'}
    <FormArchiveFolderSelect
      label="Archive folder"
      name={archiveFolderField}
      additionalFolders={_.compact([$values[archiveFolderField]])}
    />
  {/if}

  {#if storageType == 'archive' && direction == 'source'}
    <FormArchiveFilesSelect
      label={_t('importExport.sourceFiles', { defaultMessage: 'Source files' })}
      folderName={$values[archiveFolderField]}
      name={tablesField}
    />
  {/if}

  {#if format && direction == 'source'}
    <FilesInput {setPreviewSource} />
  {/if}

  {#if format?.args}
    <FormArgumentList
      args={format.args.filter(arg => !arg.direction || arg.direction == direction)}
      namePrefix={`${direction}_${format.storageType}_`}
    />
  {/if}

  {#if driver?.importExportArgs}
    <FormArgumentList
      args={driver?.importExportArgs.filter(arg => !arg.direction || arg.direction == direction)}
      namePrefix={`${direction}_${driver.engine}_`}
    />
  {/if}
</div>

<style>
  .title {
    font-size: 20px;
    text-align: center;
    margin: 10px 0px;
  }

  .column {
    margin: 10px;
    flex: 1;
  }

  .sqlwrap {
    position: relative;
    z-index: 0;
    height: 100px;
    width: 20vw;
    margin-left: var(--dim-large-form-margin);
    margin-bottom: var(--dim-large-form-margin);
    border: 1px solid var(--theme-border);
  }

  .label {
    margin-left: var(--dim-large-form-margin);
    margin-top: var(--dim-large-form-margin);
    margin-bottom: 3px;
    color: var(--theme-font-3);
  }

  .buttons {
    margin-left: var(--dim-large-form-margin);
  }
</style>
