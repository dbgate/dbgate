<script lang="ts">
  import FormCheckboxField from '../forms/FormCheckboxField.svelte';
  import FormElectronFileSelector from '../forms/FormElectronFileSelector.svelte';

  import FormPasswordField from '../forms/FormPasswordField.svelte';

  import { getFormContext } from '../forms/FormProviderCore.svelte';
  import FormRadioGroupField from '../forms/FormRadioGroupField.svelte';
  import FormSelectField from '../forms/FormSelectField.svelte';

  import FormTextField from '../forms/FormTextField.svelte';
  import { extensions } from '../stores';
  import getElectron from '../utility/getElectron';
  import { useAuthTypes } from '../utility/metadataLoaders';

  const { values } = getFormContext();
  const electron = getElectron();

  $: authType = $values.authType;
  $: engine = $values.engine;
  $: useDatabaseUrl = $values.useDatabaseUrl;
  $: authTypes = useAuthTypes({ engine });
  $: currentAuthType = $authTypes && $authTypes.find(x => x.name == authType);
  $: disabledFields = (currentAuthType ? currentAuthType.disabledFields : null) || [];
  $: driver = $extensions.drivers.find(x => x.engine == engine);
  $: defaultDatabase = $values.defaultDatabase;
</script>

<FormSelectField
  label="Database engine"
  name="engine"
  options={[
    { label: '(select driver)', value: '' },
    ...$extensions.drivers
      .filter(driver => !driver.isFileDatabase || electron)
      .map(driver => ({
        value: driver.engine,
        label: driver.title,
      })),
  ]}
/>

{#if driver?.isFileDatabase}
  <FormElectronFileSelector label="Database file" name="databaseFile" disabled={!electron} />
{:else}
  {#if driver?.supportsDatabaseUrl}
    <div class="radio">
      <FormRadioGroupField
        name="useDatabaseUrl"
        options={[
          { label: 'Fill database connection details', value: '', default: true },
          { label: 'Use database URL', value: '1' },
        ]}
      />
    </div>
  {/if}

  {#if driver?.supportsDatabaseUrl && useDatabaseUrl}
    <FormTextField label="Database URL" name="databaseUrl" placeholder={driver?.databaseUrlPlaceholder} />
  {:else}
    {#if $authTypes}
      <FormSelectField
        label="Authentication"
        name="authType"
        options={$authTypes.map(auth => ({
          value: auth.name,
          label: auth.title,
        }))}
      />
    {/if}

    <div class="row">
      <div class="col-9 mr-1">
        <FormTextField
          label="Server"
          name="server"
          disabled={disabledFields.includes('server')}
          templateProps={{ noMargin: true }}
        />
      </div>
      <div class="col-3 mr-1">
        <FormTextField
          label="Port"
          name="port"
          disabled={disabledFields.includes('port')}
          templateProps={{ noMargin: true }}
          placeholder={driver && driver.defaultPort}
        />
      </div>
    </div>

    <div class="row">
      <div class="col-6 mr-1">
        <FormTextField
          label="User"
          name="user"
          disabled={disabledFields.includes('user')}
          templateProps={{ noMargin: true }}
        />
      </div>
      <div class="col-6 mr-1">
        <FormPasswordField
          label="Password"
          name="password"
          disabled={disabledFields.includes('password')}
          templateProps={{ noMargin: true }}
        />
      </div>
    </div>

    {#if !disabledFields.includes('password')}
      <FormSelectField
        label="Password mode"
        name="passwordMode"
        options={[
          { value: 'saveEncrypted', label: 'Save and encrypt' },
          { value: 'saveRaw', label: 'Save raw (UNSAFE!!)' },
        ]}
      />
    {/if}
  {/if}

  <FormTextField label="Default database" name="defaultDatabase" />

  {#if defaultDatabase}
    <FormCheckboxField label={`Use only database ${defaultDatabase}`} name="singleDatabase" />
  {/if}
{/if}

<FormTextField label="Display name" name="displayName" />

<style>
  .row {
    margin: var(--dim-large-form-margin);
    display: flex;
  }
  .radio {
    margin-left: var(--dim-large-form-margin);
    display: flex;
  }
  .radio :global(label) {
    margin-right: 10px;
  }
</style>
