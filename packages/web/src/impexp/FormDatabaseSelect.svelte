<script lang="ts">
  import { getFormContext } from '../forms/FormProviderCore.svelte';
  import FormSelectField from '../forms/FormSelectField.svelte';
  import { useDatabaseList } from '../utility/metadataLoaders';

  export let conidName;

  const { values } = getFormContext();
  $: databases = useDatabaseList({ conid: $values[conidName] });

  $: databaseOptions = ($databases || []).map(db => ({
    value: db.name,
    label: db.name,
  }));
</script>

<FormSelectField {...$$restProps} options={databaseOptions} />
