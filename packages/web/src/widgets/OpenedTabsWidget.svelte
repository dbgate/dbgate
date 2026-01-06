<script lang="ts">
  import _ from 'lodash';

  import AppObjectList from '../appobj/AppObjectList.svelte';
  import * as closedTabAppObject from '../appobj/ClosedTabAppObject.svelte';
  import * as openedTabAppObject from '../appobj/OpenedTabAppObject.svelte';
  import * as favoriteFileAppObject from '../appobj/FavoriteFileAppObject.svelte';
  import { openedTabs } from '../stores';

  import hasPermission from '../utility/hasPermission';
  import { useFavorites } from '../utility/metadataLoaders';

  import WidgetColumnBar from './WidgetColumnBar.svelte';
  import WidgetColumnBarItem from './WidgetColumnBarItem.svelte';
  import WidgetsInnerContainer from './WidgetsInnerContainer.svelte';
  import { _t } from '../translations';

  $: favorites = useFavorites();
</script>

<WidgetColumnBar storageName="openedTabsWidget">
  <WidgetColumnBarItem title={_t('tabsWidget.openedTabs', { defaultMessage: 'Opened tabs' })} name="openedTabs">
    <WidgetsInnerContainer>
      <AppObjectList
        list={_.sortBy(
          $openedTabs.filter(x => !x.closedTime),
          x => x.tabOrder
        )}
        module={openedTabAppObject}
      />
    </WidgetsInnerContainer>
  </WidgetColumnBarItem>

  {#if hasPermission('files/favorites/read')}
    <WidgetColumnBarItem title={_t('tabsWidget.favorites', { defaultMessage: 'Favorites' })} name="favorites">
      <WidgetsInnerContainer>
        <AppObjectList list={$favorites || []} module={favoriteFileAppObject} />
      </WidgetsInnerContainer>
    </WidgetColumnBarItem>
  {/if}

  <WidgetColumnBarItem
    title={_t('tabsWidget.recentlyClosedTabs', { defaultMessage: 'Recently closed tabs' })}
    name="closedTabs"
  >
    <WidgetsInnerContainer>
      <AppObjectList
        list={_.sortBy(
          $openedTabs.filter(x => x.closedTime),
          x => -x.closedTime
        )}
        module={closedTabAppObject}
      />
    </WidgetsInnerContainer>
  </WidgetColumnBarItem>
</WidgetColumnBar>
