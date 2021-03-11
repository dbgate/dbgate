<script lang="ts">
  import { getFormContext } from '../forms/FormProviderCore.svelte';
  import FormSelectField from '../forms/FormSelectField.svelte';

  import FontIcon from '../icons/FontIcon.svelte';
  import { findFileFormat, getFileFormatDirections } from '../plugins/fileformats';
  import { extensions } from '../stores';
  import { useArchiveFiles, useDatabaseInfo } from '../utility/metadataLoaders';
  import FormConnectionSelect from './FormConnectionSelect.svelte';
  import FormDatabaseSelect from './FormDatabaseSelect.svelte';

  export let direction;
  export let storageTypeField;

  export let connectionIdField;
  export let databaseNameField;
  export let archiveFolderField;
  export let schemaNameField;
  export let tablesField = undefined;
  export let engine = undefined;

  const { values, setFieldValue } = getFormContext();

  $: types =
    $values[storageTypeField] == 'jsldata'
      ? [{ value: 'jsldata', label: 'Query result data', directions: ['source'] }]
      : [
          { value: 'database', label: 'Database', directions: ['source', 'target'] },
          ...$extensions.fileFormats.map(format => ({
            value: format.storageType,
            label: `${format.name} files(s)`,
            directions: getFileFormatDirections(format),
          })),
          { value: 'query', label: 'SQL Query', directions: ['source'] },
          { value: 'archive', label: 'Archive', directions: ['source', 'target'] },
        ];

  $: storageType = $values[storageTypeField];
  $: dbinfo = useDatabaseInfo({ conid: $values[connectionIdField], database: $values[databaseNameField] });
  $: archiveFiles = useArchiveFiles({ folder: $values[archiveFolderField] });
  $: format = findFileFormat($extensions, storageType);
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

  <FormSelectField
    options={types.filter(x => x.directions.includes(direction))}
    name={storageTypeField}
    label="Storage type"
  />

  {#if storageType == 'database' || storageType == 'query'}
    <FormConnectionSelect name={connectionIdField} label="Server" />
    <FormDatabaseSelect conidName={connectionIdField} name={databaseNameField} label="Database" />
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
</style>
