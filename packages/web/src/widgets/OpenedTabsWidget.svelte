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
  import SearchBoxWrapper from '../elements/SearchBoxWrapper.svelte';
  import SearchInput from '../elements/SearchInput.svelte';
  import CloseSearchButton from '../buttons/CloseSearchButton.svelte';

  let openedTabsfilter;
  let closedTabsFilter;

  $: favorites = useFavorites();
</script>

<WidgetColumnBar storageName="openedTabsWidget">
  <WidgetColumnBarItem title={_t('tabsWidget.openedTabs', { defaultMessage: 'Opened tabs' })} name="openedTabs">
    <SearchBoxWrapper filter={openedTabsfilter}>
      <SearchInput placeholder={_t('common.search', { defaultMessage: 'Search' })} bind:value={openedTabsfilter} />
      <CloseSearchButton bind:filter={openedTabsfilter} />
    </SearchBoxWrapper>

    <WidgetsInnerContainer>
      <AppObjectList
        list={_.sortBy(
          $openedTabs.filter(x => !x.closedTime),
          x => x.tabOrder
        )}
        module={openedTabAppObject}
        filter={openedTabsfilter}
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
    <SearchBoxWrapper filter={closedTabsFilter}>
      <SearchInput placeholder={_t('common.search', { defaultMessage: 'Search' })} bind:value={closedTabsFilter} />
      <CloseSearchButton bind:filter={closedTabsFilter} />
    </SearchBoxWrapper>

    <WidgetsInnerContainer>
      <AppObjectList
        list={_.sortBy(
          $openedTabs.filter(x => x.closedTime),
          x => -x.closedTime
        )}
        module={closedTabAppObject}
        filter={closedTabsFilter}
      />
    </WidgetsInnerContainer>
  </WidgetColumnBarItem>
</WidgetColumnBar>
