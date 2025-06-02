<script>
  import FormStyledButton from '../buttons/FormStyledButton.svelte';
  import FormProvider from '../forms/FormProvider.svelte';
  import FormSubmit from '../forms/FormSubmit.svelte';
  import FontIcon from '../icons/FontIcon.svelte';
  import { isProApp } from '../utility/proTools';
  import { openWebLink } from '../utility/simpleTools';

  import ModalBase from './ModalBase.svelte';
  import { closeCurrentModal } from './modalTools';

  export let message;
  export let licenseLimits;
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
          This is a limitation of the free version of DbGate. To continue using cloud operations, please {#if !isProApp()}download
            and{/if} purchase DbGate Premium.
        </p>
        <p>Free version limit:</p>
        <ul>
          {#each licenseLimits || [] as limit}
            <li>{limit}</li>
          {/each}
        </ul>
      </div>
    </div>

    <div slot="footer">
      <FormSubmit value="Close" on:click={closeCurrentModal} data-testid="LicenseLimitMessageModal_closeButton" />
      {#if !isProApp()}
        <FormStyledButton
          value="Download DbGate Premium"
          on:click={() => openWebLink('https://dbgate.io/download/')}
          skipWidth
        />
      {/if}
      <FormStyledButton
        value="Purchase DbGate Premium"
        on:click={() => openWebLink('https://dbgate.io/purchase/premium/')}
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
