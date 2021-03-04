<script context="module" lang="ts">
  function createTabComponent(selectedTab) {
    const tabComponent = tabs[selectedTab.tabComponent];
    if (tabComponent) {
      return {
        tabComponent,
        props: selectedTab && selectedTab.props,
      };
    }
    return null;
  }
</script>

<script lang="ts">
  import _ from 'lodash';
  import { openedTabs } from './stores';
  import tabs from './tabs';

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
        const newTab = createTabComponent(selectedTab);
        if (newTab) {
          mountedTabs = {
            ...mountedTabs,
            [tabid]: newTab,
          };
        }
      }
    }
  }
</script>

{#each _.keys(mountedTabs) as tabid (tabid)}
  <div class:tabVisible={tabid == (selectedTab && selectedTab.tabid)}>
    <svelte:component this={mountedTabs[tabid].tabComponent} {...mountedTabs[tabid].props} {tabid} />
  </div>
{/each}

<style>
  div {
    position: absolute;
    left: 0;
    top: 0;
    right: 0;
    bottom: 0;
    display: flex;
  }
  .tabVisible {
    visibility: visible;
  }
  :not(.tabVisible) {
    visibility: hidden;
  }
</style>
