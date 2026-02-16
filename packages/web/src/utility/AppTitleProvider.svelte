<script lang="ts">
  import { activeTab, currentDatabase } from '../stores';
  import getElectron from './getElectron';
  import _ from 'lodash';
  import { isProApp } from './proTools';
  import { getConnectionLabel } from 'dbgate-tools';

  $: currentDatabaseTitle =
    $currentDatabase?.name == '_api_database_' && $currentDatabase?.connection
      ? getConnectionLabel($currentDatabase.connection, { allowExplicitDatabase: false })
      : $currentDatabase?.name;
  $: title = _.compact([$activeTab?.title, currentDatabaseTitle, isProApp() ? 'DbGate Premium' : 'DbGate']).join(' - ');

  $: {
    const electron = getElectron();
    if (electron) {
      electron.send('set-title', title);
    }
  }
</script>

<svelte:head>
  <title>{title}</title>
</svelte:head>
