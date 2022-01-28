<script lang="ts">
  import { map } from 'lodash';

  import SelectField from '../forms/SelectField.svelte';
  import { useAppFolders } from '../utility/metadataLoaders';

  $: apps = useAppFolders();
</script>

<SelectField
  isNative
  {...$$restProps}
  options={[
    { label: '(New application linked to current DB)', value: 'new' },
    ...($apps || []).map(app => ({
      label: app.name,
      value: app.name,
    })),
  ]}
/>
