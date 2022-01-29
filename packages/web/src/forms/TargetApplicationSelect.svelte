<script lang="ts">
  import _ from 'lodash';
  import { createEventDispatcher } from 'svelte';

  import SelectField from '../forms/SelectField.svelte';
  import { currentDatabase } from '../stores';
  import { filterAppsForDatabase } from '../utility/appTools';
  import { useAppFolders, useUsedApps } from '../utility/metadataLoaders';

  export let value = '#new';
  export let disableInitialize = false;

  const dispatch = createEventDispatcher();

  $: appFolders = useAppFolders();
  $: usedApps = useUsedApps();

  $: {
    if (!disableInitialize && value == '#new' && $currentDatabase) {
      const filtered = filterAppsForDatabase($currentDatabase.connection, $currentDatabase.name, $usedApps || []);
      const common = _.intersection(
        ($appFolders || []).map(x => x.name),
        filtered.map(x => x.name)
      );
      if (common.length > 0) {
        value = common[0] as string;
        dispatch('change', value);
      }
    }
  }
</script>

<SelectField
  isNative
  {...$$restProps}
  {value}
  on:change={e => {
    value = e.detail;
    dispatch('change', value);
  }}
  options={[
    { label: '(New application linked to current DB)', value: '#new' },
    ...($appFolders || []).map(app => ({
      label: app.name,
      value: app.name,
    })),
  ]}
/>
