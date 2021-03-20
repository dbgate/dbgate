<script lang="ts">
  import _ from 'lodash';

  import AppObjectList from '../appobj/AppObjectList.svelte';
  import * as closedTabAppObject from '../appobj/ClosedTabAppObject.svelte';
  import { openedTabs } from '../stores';

  import hasPermission from '../utility/hasPermission';

  import WidgetColumnBar from './WidgetColumnBar.svelte';
  import WidgetColumnBarItem from './WidgetColumnBarItem.svelte';
  import WidgetsInnerContainer from './WidgetsInnerContainer.svelte';
</script>

<WidgetColumnBar>
  <!-- {#if hasPermission('files/favorites/read')}
    <WidgetColumnBarItem title="Favorites" name="favorites" height="20%">
      <FavoritesList />
    </WidgetColumnBarItem>
  {/if} -->
  <WidgetColumnBarItem title="Recently closed tabs" name="closedTabs">
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
