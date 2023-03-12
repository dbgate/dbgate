<script lang="ts">
  import TabRegister from './TabRegister.svelte';
  import TabsPanel from './TabsPanel.svelte';
  import _ from 'lodash';
  import { currentDatabase, lockedDatabaseMode, openedTabs, TabDefinition } from '../stores';
  import { shouldShowTab } from './TabsPanel.svelte';

  export let multiTabIndex;

  function findShownTab(tabs: TabDefinition[], multiTabIndex, lockedDbMode, currentDb) {
    const selectedTab = tabs.find(
      x =>
        x.selected &&
        x.closedTime == null &&
        (x.multiTabIndex || 0) == multiTabIndex &&
        shouldShowTab(x, lockedDbMode, currentDb)
    );
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
</script>

<div class="tabs">
  <TabsPanel {multiTabIndex} {shownTab} />
</div>
<div class="content">
  <TabRegister {multiTabIndex} {shownTab} />
</div>

<style>
  .tabs {
    position: absolute;
    top: 0;
    left: 0;
    height: var(--dim-tabs-panel-height);
    right: 0;
    background-color: var(--theme-bg-1);
    border-top: 1px solid var(--theme-border);
  }
  .content {
    position: absolute;
    top: var(--dim-tabs-panel-height);
    left: 0;
    bottom: 0;
    right: 0;
    background-color: var(--theme-bg-1);
  }
</style>
