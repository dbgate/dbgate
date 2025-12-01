<script>
  import FormStyledButton from '../buttons/FormStyledButton.svelte';
  import FormProvider from '../forms/FormProvider.svelte';
  import FormSubmit from '../forms/FormSubmit.svelte';
  import FontIcon from '../icons/FontIcon.svelte';
  import { isProApp } from '../utility/proTools';
  import { openWebLink } from '../utility/simpleTools';
  import { _t } from '../translations';

  import ModalBase from './ModalBase.svelte';
  import { closeCurrentModal } from './modalTools';

  export let message;
  export let licenseLimits;
</script>

<FormProvider>
  <ModalBase {...$$restProps}>
    <div slot="header">{_t('licenseLimit.licenseLimitError', { defaultMessage: 'License limit error' })}</div>

    <div class="wrapper">
      <div class="icon">
        <FontIcon icon="img error" />
      </div>
      <div data-testid="LicenseLimitMessageModal_message">
        <p>
          {_t('licenseLimit.cloudOperationEndedWithError', { defaultMessage: 'Cloud operation ended with error:' })}<br />
          {message}
        </p>

        <p>
          {_t('licenseLimit.limitationMessage', { defaultMessage: 'This is a limitation of the free version of DbGate. To continue using cloud operations, please' })} {#if !isProApp()} {_t('licenseLimit.download', { defaultMessage: 'download and' })}
            {/if} {_t('licenseLimit.purchase', { defaultMessage: 'purchase DbGate Premium.' })}
        </p>
        <p>{_t('licenseLimit.freeVersionLimit', { defaultMessage: 'Free version limit:' })}</p>
        <ul>
          {#each licenseLimits || [] as limit}
            <li>{limit}</li>
          {/each}
        </ul>
      </div>
    </div>

    <div slot="footer">
      <FormSubmit value={_t('common.close', { defaultMessage: 'Close' })} on:click={closeCurrentModal} data-testid="LicenseLimitMessageModal_closeButton" />
      {#if !isProApp()}
        <FormStyledButton
          value={_t('licenseLimit.downloadDbGatePremium', { defaultMessage: 'Download DbGate Premium' })}
          on:click={() => openWebLink('https://www.dbgate.io/download/')}
          skipWidth
        />
      {/if}
      <FormStyledButton
        value={_t('licenseLimit.purchaseDbGatePremium', { defaultMessage: 'Purchase DbGate Premium' })}
        on:click={() => openWebLink('https://www.dbgate.io/purchase/premium/')}
        skipWidth
      />
    </div>
  </ModalBase>
</FormProvider>

<style>
  .wrapper {
    display: flex;
  }

  .icon {
    margin-right: 10px;
    font-size: 20pt;
    padding-top: 30px;
  }
</style>
