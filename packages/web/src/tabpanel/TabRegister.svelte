<script lang="ts">
  import _ from 'lodash';
  import { currentDatabase, lockedDatabaseMode, openedTabs, TabDefinition } from '../stores';
  import TabContent from './TabContent.svelte';
  import tabs from '../tabs';
  import { shouldShowTab } from './TabsPanel.svelte';

  export let multiTabIndex;

  let mountedTabs = {};

  function findShownTab(tabs: TabDefinition[], multiTabIndex, lockedDbMode, currentDb) {
    const selectedTab = tabs.find(x => x.selected && x.closedTime == null && (x.multiTabIndex || 0) == multiTabIndex);
    if (selectedTab) {
      return selectedTab;
    }

    const selectedIndex = _.findLastIndex(
      tabs,
      x => (x.multiTabIndex || 0) == multiTabIndex && shouldShowTab(x, lockedDbMode, currentDb)
    );

    return tabs[selectedIndex];
  }

  $: shownTab = findShownTab($openedTabs, multiTabIndex, $lockedDatabaseMode, $currentDatabase);

  // cleanup closed tabs
  $: {
    if (
      _.difference(
        _.keys(mountedTabs),
        _.map(
          $openedTabs.filter(x => x.closedTime == null),
          'tabid'
        )
      ).length > 0
    ) {
      mountedTabs = _.pickBy(mountedTabs, (v, k) => $openedTabs.find(x => x.tabid == k && x.closedTime == null));
    }
  }

  // open missing tabs
  $: {
    if (shownTab) {
      const { tabid } = shownTab;
      if (tabid && !mountedTabs[tabid]) {
        const newTab = tabs[shownTab.tabComponent]?.default;
        if (newTab) {
          mountedTabs = {
            ...mountedTabs,
            [tabid]: newTab,
          };
        }
      }
    }
  }

  $: openedTabsByTabId = _.keyBy($openedTabs, x => x.tabid);
</script>

{#each _.keys(mountedTabs) as tabid (tabid)}
  <TabContent
    tabComponent={mountedTabs[tabid]}
    {...openedTabsByTabId[tabid]?.props}
    {tabid}
    tabVisible={tabid == (shownTab && shownTab.tabid)}
  />
{/each}
