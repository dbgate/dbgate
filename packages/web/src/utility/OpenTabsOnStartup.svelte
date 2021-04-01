<script lang="ts">
  import { onMount } from 'svelte';
  import { openFavorite } from '../appobj/FavoriteFileAppObject.svelte';
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

    if ($openedTabs.find(x => !x.closedTime)) return;

    for (const favorite of list.filter(x => x.openOnStartup)) {
      openFavorite(favorite);
    }
  }
</script>
