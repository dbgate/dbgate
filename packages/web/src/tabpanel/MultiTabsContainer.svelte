<script>
  import HorizontalSplitter from '../elements/HorizontalSplitter.svelte';
  import { currentDatabase, lockedDatabaseMode, openedTabs } from '../stores';
  import TabsContainer from './TabsContainer.svelte';
  import { shouldShowTab } from './TabsPanel.svelte';

  $: filteredTabsFromAllParts = $openedTabs.filter(x => shouldShowTab(x, $lockedDatabaseMode, $currentDatabase));
  $: isLeft = !!filteredTabsFromAllParts.find(x => !x.multiTabIndex);
  $: isRight = !!filteredTabsFromAllParts.find(x => x.multiTabIndex == 1);
</script>

<HorizontalSplitter hideFirst={!isLeft && isRight} isSplitter={isRight} allowCollapseChild1 allowCollapseChild2>
  <div class="container" slot="1">
    <TabsContainer multiTabIndex={0} />
  </div>
  <div class="container" slot="2">
    <TabsContainer multiTabIndex={1} />
  </div>
</HorizontalSplitter>
