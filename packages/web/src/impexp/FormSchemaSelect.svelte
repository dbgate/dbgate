<script lang="ts">
    import { getFormContext } from '../forms/FormProviderCore.svelte';
    import FormSelectField from '../forms/FormSelectField.svelte';
    import { useDatabaseInfo, useDatabaseList } from '../utility/metadataLoaders';
  
    export let conidName;
    export let databaseName;
  
    const { values } = getFormContext();
    $: dbinfo = useDatabaseInfo({ conid: $values[conidName], database: values[databaseName] });
  
    $: schemaOptions = (($dbinfo && $dbinfo.schemas) || []).map(schema => ({
      value: schema.schemaName,
      label: schema.schemaName,
    }));
  </script>
  
  {#if schemaOptions.length == 0}
    <div>Not available</div>
  {:else}
    <FormSelectField {...$$restProps} options={schemaOptions} />
  {/if}
  