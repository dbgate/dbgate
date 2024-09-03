<script lang="ts">
  import { activeTab, currentDatabase } from '../stores';
  import getElectron from './getElectron';
  import _ from 'lodash';
  import { isProApp } from './proTools';

  $: title = _.compact([$activeTab?.title, $currentDatabase?.name, isProApp() ? 'DbGate Premium' : 'DbGate']).join(
    ' - '
  );

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
