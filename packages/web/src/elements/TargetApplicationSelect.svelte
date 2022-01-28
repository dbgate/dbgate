<script lang="ts" context="module">
  export async function saveDbToApp(conid, database, app) {
    if (app == '#new') {
      const folder = await apiCall('apps/create-folder', { folder: database });

      await apiCall('connections/update-database', {
        conid,
        database,
        values: {
          [`useApp:${folder}`]: true,
        },
      });

      return folder;
    }

    await apiCall('connections/update-database', {
      conid,
      database,
      values: {
        [`useApp:${app}`]: true,
      },
    });

    return app;
  }
</script>

<script lang="ts">
  import _ from 'lodash';
  import { filterAppsForDatabase } from '../appobj/DatabaseAppObject.svelte';

  import SelectField from '../forms/SelectField.svelte';
  import { currentDatabase } from '../stores';
  import { apiCall } from '../utility/api';
  import { useAppFolders, useUsedApps } from '../utility/metadataLoaders';

  export let value = '#new';

  $: appFolders = useAppFolders();
  $: usedApps = useUsedApps();

  $: {
    if (value == '#new' && $currentDatabase) {
      const filtered = filterAppsForDatabase($currentDatabase.connection, $currentDatabase.name, $usedApps || []);
      const common = _.intersection(
        ($appFolders || []).map(x => x.name),
        filtered.map(x => x.name)
      );
      if (common.length > 0) {
        value = common[0] as string;
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
  }}
  options={[
    { label: '(New application linked to current DB)', value: '#new' },
    ...($appFolders || []).map(app => ({
      label: app.name,
      value: app.name,
    })),
  ]}
/>
