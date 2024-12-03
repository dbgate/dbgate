<script lang="ts">
  import { onMount } from 'svelte';
  import { openFavorite } from '../appobj/FavoriteFileAppObject.svelte';
  import runCommand from '../commands/runCommand';
  import ErrorMessageModal from '../modals/ErrorMessageModal.svelte';
  import { showModal } from '../modals/modalTools';
  import { commandsCustomized, openedTabs } from '../stores';

  import { getConfig, getConnectionList, useFavorites } from './metadataLoaders';
  import openNewTab from './openNewTab';
  import { showSnackbarInfo } from './snackbar';

  $: favorites = useFavorites();
  let opened = false;

  onMount(() => {
    openOnStartup($favorites);
  });

  $: openOnStartup($favorites);

  async function openOnStartup(list) {
    if (!list) return;
    if (opened) return;

    opened = true;

    const { hash } = document.location;
    const openFavoriteName = hash && hash.startsWith('#favorite=') ? hash.substring('#favorite='.length) : null;
    const openTabdata = hash && hash.startsWith('#tabdata=') ? hash.substring('#tabdata='.length) : null;

    if (openFavoriteName) {
      const open = list.find(x => x.urlPath == openFavoriteName);
      if (open) {
        openFavorite(open);
        window.history.replaceState(null, null, ' ');
      }
    } else if (openTabdata) {
      try {
        const json = JSON.parse(decodeURIComponent(openTabdata));
        openFavorite(json);
        window.history.replaceState(null, null, ' ');
      } catch (err) {
        showModal(ErrorMessageModal, { message: err.message });
      }
    } else if (!$openedTabs.find(x => x.closedTime == null)) {
      for (const favorite of list.filter(x => x.openOnStartup)) {
        openFavorite(favorite);
      }
    }

    if (
      !$openedTabs.find(x => x.closedTime == null) &&
      !(await getConnectionList()).length &&
      $commandsCustomized['new.connection']?.enabled
    ) {
      openNewTab({
        title: 'New Connection',
        icon: 'img connection',
        tabComponent: 'ConnectionTab',
      });
    }

    const config = await getConfig();
    const appVersion = localStorage.getItem('appVersion');
    if (appVersion && appVersion != config.version) {
      runCommand('tabs.changelog');
      showSnackbarInfo(`DbGate upgraded from version ${appVersion} to version ${config.version}`);
    }
    localStorage.setItem('appVersion', config.version);
  }
</script>
