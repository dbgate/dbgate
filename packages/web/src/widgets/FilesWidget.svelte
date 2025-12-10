<script lang="ts">
  import SavedFilesList from './SavedFilesList.svelte';

  import WidgetColumnBar from './WidgetColumnBar.svelte';
  import WidgetColumnBarItem from './WidgetColumnBarItem.svelte';

  import AppObjectList from '../appobj/AppObjectList.svelte';
  import * as closedTabAppObject from '../appobj/ClosedTabAppObject.svelte';
  import * as favoriteFileAppObject from '../appobj/FavoriteFileAppObject.svelte';
  import { openedTabs } from '../stores';

  import hasPermission from '../utility/hasPermission';
  import { useFavorites } from '../utility/metadataLoaders';
  import { _t } from '../translations';

  import WidgetsInnerContainer from './WidgetsInnerContainer.svelte';

  $: favorites = useFavorites();
</script>

<WidgetColumnBar storageName="filesWidget">
  <WidgetColumnBarItem title={_t('files.savedFiles', { defaultMessage: 'Saved files' })} name="files" height="70%">
    <SavedFilesList />
  </WidgetColumnBarItem>

  {#if hasPermission('files/favorites/read')}
    <WidgetColumnBarItem title={_t('files.favorites', { defaultMessage: 'Favorites' })} name="favorites">
      <WidgetsInnerContainer>
        <AppObjectList list={$favorites || []} module={favoriteFileAppObject} />
      </WidgetsInnerContainer>
    </WidgetColumnBarItem>
  {/if}
</WidgetColumnBar>
