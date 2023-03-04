<script lang="ts">
  import _ from 'lodash';
  import { openedTabs } from '../stores';
  import TabContent from './TabContent.svelte';
  import tabs from '../tabs';

  let mountedTabs = {};
  $: selectedTab = $openedTabs.find(x => x.selected && x.closedTime == null);

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
    if (selectedTab) {
      const { tabid } = selectedTab;
      if (tabid && !mountedTabs[tabid]) {
        const newTab = tabs[selectedTab.tabComponent]?.default;
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
    tabVisible={tabid == (selectedTab && selectedTab.tabid)}
  />
{/each}
