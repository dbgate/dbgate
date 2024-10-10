<script lang="ts">
  import FormStyledButton from '../buttons/FormStyledButton.svelte';

  import FormProvider from '../forms/FormProvider.svelte';
  import FormSubmit from '../forms/FormSubmit.svelte';
  import FormTextField from '../forms/FormTextField.svelte';
  import { apiCall } from '../utility/api';

  import getElectron from '../utility/getElectron';
  import ModalBase from './ModalBase.svelte';
  import { closeCurrentModal } from './modalTools';

  export let parameterNames;
  export let parameterValues;
  export let onExecute;

  const handleSubmit = async e => {
    closeCurrentModal();
    onExecute(e.detail);
  };

  const handleClose = () => {
    closeCurrentModal();
  };
</script>

<FormProvider initialValues={parameterValues}>
  <ModalBase {...$$restProps}>
    <svelte:fragment slot="header">Edit query parameters</svelte:fragment>

    <div class="params">
      {#each parameterNames as parameterName, index}
        <FormTextField label={parameterName} name={parameterName} focused={index == 0} />
      {/each}
    </div>

    <div>String values must be 'quoted'. You can use valid SQL expressions.</div>

    <svelte:fragment slot="footer">
      <FormSubmit value="Run query" on:click={handleSubmit} />
      <FormStyledButton value="Close" on:click={handleClose} />
    </svelte:fragment>
  </ModalBase>
</FormProvider>

<style>
  .params {
    overflow-y: auto;
    max-height: 60vh;
  }
</style>
