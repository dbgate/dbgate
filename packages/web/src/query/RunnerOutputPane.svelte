<script lang="ts">
  import HorizontalSplitter from '../elements/HorizontalSplitter.svelte';
  import WidgetTitle from '../widgets/WidgetTitle.svelte';
  import RunnerOutputFiles from './RunnerOutputFiles.svelte';
  import SocketMessageView from './SocketMessageView.svelte';
  import { _t } from '../translations';

  export let runnerId;
  export let executeNumber;
</script>

<HorizontalSplitter>
  <div class="container" slot="1">
    <WidgetTitle>{_t('query.Messages', { defaultMessage: 'Messages' })}</WidgetTitle>
    <SocketMessageView
      eventName={runnerId ? `runner-info-${runnerId}` : null}
      {executeNumber}
      showNoMessagesAlert
      showCaller
    />
  </div>
  <div class="container" slot="2">
    <WidgetTitle>{_t('query.OutputFiles', { defaultMessage: 'Output files' })}</WidgetTitle>
    <RunnerOutputFiles {runnerId} {executeNumber} />
  </div>
</HorizontalSplitter>

<style>
  .container {
    flex: 1;
    display: flex;
    flex-direction: column;
  }
</style>
