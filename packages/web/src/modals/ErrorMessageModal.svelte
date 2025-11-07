<script>
  import FormStyledButton from '../buttons/FormStyledButton.svelte';
  import FormProvider from '../forms/FormProvider.svelte';
  import FormSubmit from '../forms/FormSubmit.svelte';
  import FontIcon from '../icons/FontIcon.svelte';

  import ModalBase from './ModalBase.svelte';
  import { closeCurrentModal } from './modalTools';
  import { _t } from '../translations';

  export let title = _t('common.error', { defaultMessage: 'Error' });
  export let message;
  export let showAsCode = false;
</script>

<FormProvider>
  <ModalBase {...$$restProps}>
    <div slot="header">{title}</div>

    {#if showAsCode}
      <pre>{message}</pre>
    {:else}
      <div class="wrapper">
        <div class="icon">
          <FontIcon icon="img error" />
        </div>
        <div data-testid="ErrorMessageModal_message">
          {message}
        </div>
      </div>
    {/if}

    <div slot="footer">
      <FormSubmit value={_t('common.close', { defaultMessage: 'Close' })} on:click={closeCurrentModal} data-testid="ErrorMessageModal_closeButton" />
    </div>
  </ModalBase>
</FormProvider>

<style>
  .wrapper {
    display: flex;
    align-items: center;
  }

  .icon {
    margin-right: 10px;
    font-size: 20pt;
  }

  pre {
    max-height: calc(100vh - 300px);
    overflow-y: auto;
  }
</style>
