<script lang="ts">
  import _ from 'lodash';
  import FormStyledButton from '../buttons/FormStyledButton.svelte';
  import TabControl from '../elements/TabControl.svelte';

  import FormCheckboxField from '../forms/FormCheckboxField.svelte';
  import FormTextField from '../forms/FormTextField.svelte';
  import FormValues from '../forms/FormValues.svelte';
  import SettingsFormProvider from '../forms/SettingsFormProvider.svelte';
  import FontIcon from '../icons/FontIcon.svelte';

  import ModalBase from '../modals/ModalBase.svelte';
  import { closeCurrentModal } from '../modals/modalTools';
  import { extensions } from '../stores';
  import getElectron from '../utility/getElectron';
  import ThemeSkeleton from './ThemeSkeleton.svelte';

  const electron = getElectron();
  let restartWarning = false;

  export let selectedTab = 0;
</script>

<SettingsFormProvider>
  <ModalBase {...$$restProps} noPadding>
    <div slot="header">Settings</div>

    <FormValues let:values>
      <TabControl
        bind:value={selectedTab}
        isInline
        tabs={[
          { label: 'General', slot: 1 },
          { label: 'Themes', slot: 2 },
        ]}
      >
        <svelte:fragment slot="1">
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
        </svelte:fragment>
        <svelte:fragment slot="2">
          <div class="heading">Application theme</div>
          <div class="themes">
            {#each $extensions.themes as theme}
              <ThemeSkeleton {theme} />
            {/each}
          </div>
        </svelte:fragment>
      </TabControl>
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
    margin-left: var(--dim-large-form-margin);
    margin-top: var(--dim-large-form-margin);
  }

  .themes {
    overflow-x: scroll;
    display: flex;
  }
</style>
