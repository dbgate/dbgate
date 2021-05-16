<script lang="ts">
  import _ from 'lodash';

  import FormButton from '../forms/FormButton.svelte';
  import FormCheckboxField from '../forms/FormCheckboxField.svelte';

  import FormProvider from '../forms/FormProvider.svelte';
  import FormSubmit from '../forms/FormSubmit.svelte';
  import FormTextField from '../forms/FormTextField.svelte';
  import FormValues from '../forms/FormValues.svelte';

  import ModalBase from '../modals/ModalBase.svelte';
  import { closeCurrentModal } from '../modals/modalTools';
  import { getCurrentSettings, getVisibleToolbar, visibleToolbar } from '../stores';
  import axiosInstance from '../utility/axiosInstance';

  function handleOk(e) {
    axiosInstance.post(
      'config/update-settings',
      _.omitBy(e.detail, (v, k) => k.startsWith(':'))
    );
    visibleToolbar.set(!!e.detail[':visibleToolbar']);
    closeCurrentModal();
  }
</script>

<FormProvider
  initialValues={{
    ...getCurrentSettings(),
    ':visibleToolbar': getVisibleToolbar(),
  }}
>
  <ModalBase {...$$restProps}>
    <div slot="header">Settings</div>

    <FormValues let:values>
      <div class="heading">Appearance</div>
      <FormCheckboxField name=":visibleToolbar" label="Show toolbar" defaultValue={true} />

      <div class="heading">Data grid</div>
      <FormCheckboxField name="dataGrid.hideLeftColumn" label="Hide left column by default" />
      <FormTextField
        name="dataGrid.pageSize"
        label="Page size (number of rows for incremental loading, must be between 5 and 1000)"
        defaultValue="100"
      />
      <FormCheckboxField name="dataGrid.showHintColumns" label="Show foreign key hints" defaultValue={true} />

      <div class="heading">Connection</div>
      <FormCheckboxField
        name="connection.autoRefresh"
        label="Automatic refresh of database model on background"
        defaultValue={false}
      />
      <FormTextField
        name="connection.autoRefreshInterval"
        label="Interval between automatic refreshes in seconds"
        defaultValue="30"
        disabled={values['connection.autoRefresh'] === false}
      />
    </FormValues>

    <div slot="footer">
      <FormSubmit value="OK" on:click={handleOk} />
      <FormButton value="Cancel" on:click={closeCurrentModal} />
    </div>
  </ModalBase>
</FormProvider>

<style>
  .heading {
    font-size: 20px;
    margin: 5px;
  }
</style>
