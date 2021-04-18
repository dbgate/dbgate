<script lang="ts">
  import FormButton from '../forms/FormButton.svelte';
  import FormCheckboxField from '../forms/FormCheckboxField.svelte';

  import FormProvider from '../forms/FormProvider.svelte';
  import FormSubmit from '../forms/FormSubmit.svelte';
  import FormTextField from '../forms/FormTextField.svelte';

  import ModalBase from '../modals/ModalBase.svelte';
  import { closeCurrentModal } from '../modals/modalTools';
  import axiosInstance from '../utility/axiosInstance';
  import { useSettings } from '../utility/metadataLoaders';

  const settings = useSettings();

  function handleOk(e) {
    axiosInstance.post('config/update-settings', e.detail);
    closeCurrentModal();
  }
</script>

{#if $settings}
  <FormProvider initialValues={$settings}>
    <ModalBase {...$$restProps}>
      <div slot="header">Settings</div>

      <div class="heading">Data grid</div>
      <FormCheckboxField name="dataGrid.hideLeftColumn" label="Hide left column by default" />
      <FormTextField name="dataGrid.pageSize" label="Page size (number of rows for incremental loading)" defaultValue="100" />
      <FormCheckboxField name="dataGrid.showHintColumns" label="Show foreign key hints" defaultValue={true} />

      <div slot="footer">
        <FormSubmit value="OK" on:click={handleOk} />
        <FormButton value="Cancel" on:click={closeCurrentModal} />
      </div>
    </ModalBase>
  </FormProvider>
{/if}

<style>
  .heading {
    font-size: 20px;
    margin: 5px;
  }
</style>
