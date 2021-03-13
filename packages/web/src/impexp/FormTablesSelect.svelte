<script lang="ts">
  import { getFormContext } from '../forms/FormProviderCore.svelte';
  import FormSelectField from '../forms/FormSelectField.svelte';
  import { useDatabaseInfo, useDatabaseList } from '../utility/metadataLoaders';

  export let conidName;
  export let databaseName;
  export let schemaName;

  const { values } = getFormContext();
  $: dbinfo = useDatabaseInfo({ conid: $values[conidName], database: $values[databaseName] });

  $: tablesOptions = [...(($dbinfo && $dbinfo.tables) || []), ...(($dbinfo && $dbinfo.views) || [])]
    .filter(x => !$values[schemaName] || x.schemaName == $values[schemaName])
    .map(x => ({
      value: x.pureName,
      label: x.pureName,
    }));
</script>

<FormSelectField {...$$restProps} options={tablesOptions} isMulti />
