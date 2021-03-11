<script lang="ts">
  import HorizontalSplitter from '../elements/HorizontalSplitter.svelte';
  import WidgetTitle from '../widgets/WidgetTitle.svelte';
  import RunnerOutputFiles from './RunnerOutputFiles';
  import SocketMessageView from './SocketMessageView.svelte';

  export let runnerId;
  export let executeNumber;
</script>

<HorizontalSplitter>
  <div class="container">
    <WidgetTitle>Messages</WidgetTitle>
    <SocketMessageView eventName={runnerId ? `runner-info-${runnerId}` : null} {executeNumber} />
  </div>
  <div class="container">
    <WidgetTitle>Output files</WidgetTitle>
    <RunnerOutputFiles {runnerId} {executeNumber} />
  </div>
</HorizontalSplitter>

<style>
  div {
    flex: 1;
    display: flex;
    flex-direction: column;
  }
</style>
