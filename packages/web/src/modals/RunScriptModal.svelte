<script lang="ts">
  import { onMount, tick } from 'svelte';

  import FormStyledButton from '../buttons/FormStyledButton.svelte';

  import FormProvider from '../forms/FormProvider.svelte';
  import SocketMessageView from '../query/SocketMessageView.svelte';
  import { apiCall, apiOff, apiOn } from '../utility/api';
  import ModalBase from './ModalBase.svelte';
  import { closeCurrentModal } from './modalTools';

  export let script;
  export let header;

  let isRunning;
  let runid;
  let isCanceled;

  let executeNumber = 0;

  const handleStop = async () => {
    closeCurrentModal();
    apiCall('runners/cancel', { runid });
  };

  const handleClose = () => {
    closeCurrentModal();
  };

  const initialize = async () => {
    await tick();
    const resp = await apiCall('runners/start', { script });
    runid = resp.runid;
    let isCanceled = false;

    function handleRunnerDone() {
      isRunning = false;
      apiOff(`runner-done-${runid}`, handleRunnerDone);
      //   if (isCanceled) {
      //     showSnackbarError(canceledMessage);
      //   } else {
      //     showSnackbarInfo(finishedMessage);
      //     if (afterFinish) afterFinish();
      //   }
    }

    apiOn(`runner-done-${runid}`, handleRunnerDone);
  };

  onMount(() => {
    initialize();
  });
</script>

<FormProvider>
  <ModalBase {...$$restProps}>
    <svelte:fragment slot="header">
      {header}
    </svelte:fragment>

    <div class="messages">
      <SocketMessageView eventName={runid ? `runner-info-${runid}` : null} {executeNumber} showNoMessagesAlert />
    </div>

    <svelte:fragment slot="footer">
      {#if isRunning}
        <FormStyledButton value="Stop" on:click={handleStop} />
      {:else}
        <FormStyledButton value="Close" on:click={handleClose} />
      {/if}
    </svelte:fragment>
  </ModalBase>
</FormProvider>

<style>
  .messages {
    height: 30vh;
    display: flex;
  }
</style>
