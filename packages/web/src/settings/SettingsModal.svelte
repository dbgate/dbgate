<script lang="ts">
  import _ from 'lodash';
  import FormStyledButton from '../buttons/FormStyledButton.svelte';

  import FormCheckboxField from '../forms/FormCheckboxField.svelte';
  import FormTextField from '../forms/FormTextField.svelte';
  import FormValues from '../forms/FormValues.svelte';
  import SettingsFormProvider from '../forms/SettingsFormProvider.svelte';
  import FontIcon from '../icons/FontIcon.svelte';

  import ModalBase from '../modals/ModalBase.svelte';
  import { closeCurrentModal } from '../modals/modalTools';
  import getElectron from '../utility/getElectron';
  import { showSnackbarInfo } from '../utility/snackbar';

  const electron = getElectron();
  let restartWarning = false;
</script>

<SettingsFormProvider>
  <ModalBase {...$$restProps}>
    <div slot="header">Settings</div>

    <FormValues let:values>
      {#if electron}
        <div class="heading">Appearance</div>
        <FormCheckboxField
          name="app.useNativeMenu"
          label="Use system native menu"
          on:change={() => {
            restartWarning = true;
          }}
        />
        {#if restartWarning}
          <div class="ml-5 mb-3">
            <FontIcon icon="img warn" /> Native menu settings will be applied after app restart
          </div>
        {/if}
      {/if}

      <div class="heading">Data grid</div>
      <FormTextField
        name="dataGrid.pageSize"
        label="Page size (number of rows for incremental loading, must be between 5 and 1000)"
        defaultValue="100"
      />
      <FormCheckboxField name="dataGrid.showHintColumns" label="Show foreign key hints" defaultValue={true} />
      <!-- <FormCheckboxField name="dataGrid.showHintColumns" label="Show foreign key hints" defaultValue={true} /> -->

      <FormCheckboxField name="dataGrid.thousandsSeparator" label="Use thousands separator for numbers" />

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
      <!-- <FormSubmit value="OK" on:click={handleOk} /> -->
      <FormStyledButton value="Close" on:click={closeCurrentModal} />
    </div>
  </ModalBase>
</SettingsFormProvider>

<style>
  .heading {
    font-size: 20px;
    margin: 5px;
  }
</style>
