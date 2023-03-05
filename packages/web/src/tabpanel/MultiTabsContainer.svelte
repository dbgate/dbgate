<script>
  import HorizontalSplitter from '../elements/HorizontalSplitter.svelte';
  import { openedTabs } from '../stores';
  import TabsContainer from './TabsContainer.svelte';

  $: isLeft = !!$openedTabs.find(x => x.closedTime == null && !x.multiTabIndex);
  $: isRight = !!$openedTabs.find(x => x.closedTime == null && x.multiTabIndex == 1);
</script>

<HorizontalSplitter hideFirst={!isLeft && isRight} isSplitter={isRight}>
  <div class="container" slot="1">
    <TabsContainer multiTabIndex={0} />
  </div>
  <div class="container" slot="2">
    <TabsContainer multiTabIndex={1} />
  </div>
</HorizontalSplitter>
