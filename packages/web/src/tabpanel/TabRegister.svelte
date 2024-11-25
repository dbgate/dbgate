<script lang="ts">
  import _ from 'lodash';
  import { openedTabs } from '../stores';
  import TabContent from './TabContent.svelte';
  import tabs from '../tabs';

  export let multiTabIndex;
  export let shownTab;

  let mountedTabs = {};

  // cleanup closed tabs
  $: {
    if (
      _.difference(
        _.keys(mountedTabs),
        _.map(
          $openedTabs.filter(x => x.closedTime == null && (x.multiTabIndex || 0) == multiTabIndex),
          'tabid'
        )
      ).length > 0
    ) {
      mountedTabs = _.pickBy(mountedTabs, (v, k) =>
        $openedTabs.find(x => x.tabid == k && x.closedTime == null && (x.multiTabIndex || 0) == multiTabIndex)
      );
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
    unsaved={openedTabsByTabId[tabid]?.unsaved}
    tabVisible={tabid == shownTab?.tabid}
    tabFocused={tabid == shownTab?.tabid && shownTab?.focused}
    tabPreviewMode={tabid == shownTab?.tabid && shownTab?.tabPreviewMode}
  />
{/each}
