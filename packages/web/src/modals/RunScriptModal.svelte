<script lang="ts">
  import { onMount, tick } from 'svelte';

  import FormStyledButton from '../buttons/FormStyledButton.svelte';

  import FormProvider from '../forms/FormProvider.svelte';
  import FontIcon from '../icons/FontIcon.svelte';
  import SocketMessageView from '../query/SocketMessageView.svelte';
  import { apiCall, apiOff, apiOn } from '../utility/api';
  import { showSnackbarError } from '../utility/snackbar';
  import ModalBase from './ModalBase.svelte';
  import { closeCurrentModal } from './modalTools';

  export let script;
  export let header;

  export let openResultLabel;
  export let onOpenResult;

  let isRunning = true;
  let runid;
  let isCanceled;

  let executeNumber = 0;

  const handleStop = async () => {
    closeCurrentModal();
    apiCall('runners/cancel', { runid });
    isCanceled = true;
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
      if (isCanceled) {
        showSnackbarError('Process canceled');
      }
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
      <div class="flex">
        {header}
        {#if isRunning}
          <FontIcon icon="icon loading" padLeft />
        {/if}
      </div>
    </svelte:fragment>

    <div class="messages">
      <SocketMessageView
        eventName={runid ? `runner-info-${runid}` : null}
        {executeNumber}
        showNoMessagesAlert
        showCaller
      />
    </div>

    <svelte:fragment slot="footer">
      {#if isRunning}
        <FormStyledButton value="Stop" on:click={handleStop} data-testid="RunScriptModal_stop" />
      {:else}
        <FormStyledButton value="Close" on:click={handleClose} data-testid="RunScriptModal_close" />
      {/if}

      {#if onOpenResult && !isRunning}
        <FormStyledButton
          value={openResultLabel || 'Open result'}
          on:click={() => {
            closeCurrentModal();
            onOpenResult();
          }}
        />
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
