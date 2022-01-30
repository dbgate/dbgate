<script lang="ts">
  import { currentDatabase } from '../stores';
  import getElectron from './getElectron';

  $: title = $currentDatabase?.name ? `${$currentDatabase?.name} - DbGate` : 'DbGate';

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
