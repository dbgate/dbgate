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
  isNative
  options={[
    { label: '(select driver)', value: '' },
    ...$extensions.drivers
      .filter(driver => !driver.isElectronOnly || electron)
      .map(driver => ({
        value: driver.engine,
        label: driver.title,
      })),
  ]}
/>

{#if !driver?.showConnectionField || driver.showConnectionField('databaseFile', $values)}
  <FormElectronFileSelector label="Database file" name="databaseFile" disabled={!electron} />
{/if}

{#if !driver?.showConnectionField || driver.showConnectionField('useDatabaseUrl', $values)}
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

{#if !driver?.showConnectionField || driver.showConnectionField('databaseUrl', $values)}
  <FormTextField label="Database URL" name="databaseUrl" placeholder={driver?.databaseUrlPlaceholder} />
{/if}

{#if $authTypes && (!driver?.showConnectionField || driver.showConnectionField('authType', $values))}
  <FormSelectField
    label="Authentication"
    name="authType"
    options={$authTypes.map(auth => ({
      value: auth.name,
      label: auth.title,
    }))}
  />
{/if}

{#if !driver?.showConnectionField || driver.showConnectionField('server', $values)}
  <div class="row">
    <div class="col-9 mr-1">
      <FormTextField
        label="Server"
        name="server"
        disabled={disabledFields.includes('server')}
        templateProps={{ noMargin: true }}
      />
    </div>
    {#if !driver?.showConnectionField || driver.showConnectionField('port', $values)}
      <div class="col-3 mr-1">
        <FormTextField
          label="Port"
          name="port"
          disabled={disabledFields.includes('port')}
          templateProps={{ noMargin: true }}
          placeholder={driver && driver.defaultPort}
        />
      </div>
    {/if}
  </div>
{/if}

{#if !driver?.showConnectionField || driver.showConnectionField('user', $values)}
  <div class="row">
    <div class="col-6 mr-1">
      <FormTextField
        label="User"
        name="user"
        disabled={disabledFields.includes('user')}
        templateProps={{ noMargin: true }}
      />
    </div>
    {#if !driver?.showConnectionField || driver.showConnectionField('password', $values)}
      <div class="col-6 mr-1">
        <FormPasswordField
          label="Password"
          name="password"
          disabled={disabledFields.includes('password')}
          templateProps={{ noMargin: true }}
        />
      </div>
    {/if}
  </div>
{/if}

{#if !disabledFields.includes('password') && (!driver?.showConnectionField || driver.showConnectionField('password', $values))}
  <FormSelectField
    label="Password mode"
    isNative
    name="passwordMode"
    defaultValue="saveEncrypted"
    options={[
      { value: 'saveEncrypted', label: 'Save and encrypt' },
      { value: 'saveRaw', label: 'Save raw (UNSAFE!!)' },
    ]}
  />
{/if}

{#if !driver?.showConnectionField || driver.showConnectionField('defaultDatabase', $values)}
  <FormTextField label="Default database" name="defaultDatabase" />
{/if}

{#if defaultDatabase && (!driver?.showConnectionField || driver.showConnectionField('singleDatabase', $values))}
  <FormCheckboxField label={`Use only database ${defaultDatabase}`} name="singleDatabase" />
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
