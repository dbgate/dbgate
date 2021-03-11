<script lang="ts">
  import { getFormContext } from '../forms/FormProviderCore.svelte';
  import FormSelectField from '../forms/FormSelectField.svelte';
  import { useDatabaseInfo, useDatabaseList } from '../utility/metadataLoaders';
  import SvelteSelect from 'svelte-select';

  export let conidName;
  export let databaseName;
  export let schemaName;

  const { values } = getFormContext();
  $: dbinfo = useDatabaseInfo({ conid: $values[conidName], database: values[databaseName] });

  $: tablesOptions = [...(($dbinfo && $dbinfo.tables) || []), ...(($dbinfo && $dbinfo.views) || [])]
    .filter(x => !$values[schemaName] || x.schemaName == $values[schemaName])
    .map(x => ({
      value: x.pureName,
      label: x.pureName,
    }));
</script>

{#if tablesOptions.length == 0}
  <div>Not available</div>
{:else}
  <SvelteSelect {...$$restProps} items={tablesOptions} isMulti listOpen />
{/if}
