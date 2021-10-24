<script lang="ts">
  import _ from 'lodash';

  import { getFormContext } from '../forms/FormProviderCore.svelte';
  import FormSelectField from '../forms/FormSelectField.svelte';
  import { useDatabaseList } from '../utility/metadataLoaders';

  export let conidName;

  const { values } = getFormContext();
  $: databases = useDatabaseList({ conid: $values && $values[conidName] });

  $: databaseOptions = _.sortBy(
    ($databases || []).map(db => ({
      value: db.name,
      label: db.name,
    })),
    'label'
  );
</script>

<FormSelectField {...$$restProps} options={databaseOptions} />
