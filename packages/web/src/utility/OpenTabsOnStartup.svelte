<script lang="ts">
  import { onMount } from 'svelte';
  import { openFavorite } from '../appobj/FavoriteFileAppObject.svelte';
  import ErrorMessageModal from '../modals/ErrorMessageModal.svelte';
  import { showModal } from '../modals/modalTools';
  import { openedTabs } from '../stores';

  import { useFavorites } from './metadataLoaders';

  $: favorites = useFavorites();
  let opened = false;

  onMount(() => {
    openOnStartup($favorites);
  });

  $: openOnStartup($favorites);

  function openOnStartup(list) {
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
  }
</script>
