<script>
  import FormStyledButton from '../buttons/FormStyledButton.svelte';
  import FormProvider from '../forms/FormProvider.svelte';
  import FormSubmit from '../forms/FormSubmit.svelte';
  import FontIcon from '../icons/FontIcon.svelte';
  import { openWebLink } from '../utility/simpleTools';

  import ModalBase from './ModalBase.svelte';
  import { closeCurrentModal } from './modalTools';

  export let message;

  function handlePurchase() {
    closeCurrentModal();
    openWebLink('https://dbgate.io/purchase/premium/', '_blank');
  }
</script>

<FormProvider>
  <ModalBase {...$$restProps}>
    <div slot="header">License limit error</div>

    <div class="wrapper">
      <div class="icon">
        <FontIcon icon="img error" />
      </div>
      <div data-testid="LicenseLimitMessageModal_message">
        <p>
          Cloud operation ended with error:<br />
          {message}
        </p>

        <p>
          This is a limitation of the free version of DbGate. To continue using cloud operations, please purchase DbGate
          Premium.
        </p>
        <p>Free version limit:</p>
        <ul>
          <li>max 5 connections</li>
          <li>plus max 5 files</li>
        </ul>
      </div>
    </div>

    <div slot="footer">
      <FormSubmit value="Close" on:click={closeCurrentModal} data-testid="LicenseLimitMessageModal_closeButton" />
      <FormStyledButton value="Purchase DbGate Premium" on:click={handlePurchase} skipWidth />
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
