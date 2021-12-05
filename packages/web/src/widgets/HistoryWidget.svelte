<script lang="ts">
  import _ from 'lodash';

  import AppObjectList from '../appobj/AppObjectList.svelte';
  import * as closedTabAppObject from '../appobj/ClosedTabAppObject.svelte';
  import * as favoriteFileAppObject from '../appobj/FavoriteFileAppObject.svelte';
  import { openedTabs } from '../stores';

  import hasPermission from '../utility/hasPermission';
  import { useFavorites } from '../utility/metadataLoaders';
  import QueryHistoryList from './QueryHistoryList.svelte';

  import WidgetColumnBar from './WidgetColumnBar.svelte';
  import WidgetColumnBarItem from './WidgetColumnBarItem.svelte';
  import WidgetsInnerContainer from './WidgetsInnerContainer.svelte';

  $: favorites = useFavorites();

</script>

<WidgetColumnBar>
  <WidgetColumnBarItem title="Recently closed tabs" name="closedTabs" storageName='closedTabsWidget'>
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
  <WidgetColumnBarItem title="Query history" name="queryHistory" storageName='queryHistoryWidget'>
    <QueryHistoryList />
  </WidgetColumnBarItem>
</WidgetColumnBar>
