<script lang="ts">
  import _ from 'lodash';
  import { getFormContext } from '../forms/FormProviderCore.svelte';
  import FormSelectField from '../forms/FormSelectField.svelte';
  import { useSchemaList } from '../utility/metadataLoaders';

  export let conidName;
  export let databaseName;
  export let allowAllSchemas = false;

  const { values } = getFormContext();
  $: schemaList = useSchemaList({ conid: $values[conidName], database: $values[databaseName] });

  $: schemaOptions = (_.isArray($schemaList) ? $schemaList : []).map(schema => ({
    value: schema.schemaName,
    label: schema.schemaName,
  }));
</script>

{#if schemaOptions.length > 0}
  <FormSelectField
    {...$$restProps}
    options={allowAllSchemas ? [{ value: '__all', label: '(All schemas)' }, ...schemaOptions] : schemaOptions}
  />
{/if}
