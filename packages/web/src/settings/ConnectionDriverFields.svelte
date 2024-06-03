<script lang="ts">
  import FormCheckboxField from '../forms/FormCheckboxField.svelte';
  import FormElectronFileSelector from '../forms/FormElectronFileSelector.svelte';

  import FormPasswordField from '../forms/FormPasswordField.svelte';
  import _ from 'lodash';

  import { getFormContext } from '../forms/FormProviderCore.svelte';
  import FormRadioGroupField from '../forms/FormRadioGroupField.svelte';
  import FormSelectField from '../forms/FormSelectField.svelte';

  import FormTextField from '../forms/FormTextField.svelte';
  import { extensions, getCurrentConfig, openedConnections, openedSingleDatabaseConnections } from '../stores';
  import getElectron from '../utility/getElectron';
  import { useAuthTypes } from '../utility/metadataLoaders';
  import FormColorField from '../forms/FormColorField.svelte';
  import FontIcon from '../icons/FontIcon.svelte';

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

  $: showUser = driver?.showConnectionField('user', $values) && $values.passwordMode != 'askUser';
  $: showPassword =
    driver?.showConnectionField('password', $values) &&
    $values.passwordMode != 'askPassword' &&
    $values.passwordMode != 'askUser';
  $: showPasswordMode = driver?.showConnectionField('password', $values);
  $: isConnected = $openedConnections.includes($values._id) || $openedSingleDatabaseConnections.includes($values._id);
</script>

<FormSelectField
  label="Connection type"
  name="engine"
  isNative
  disabled={isConnected}
  options={[
    { label: '(select connection type)', value: '' },
    ...$extensions.drivers
      .filter(driver => !driver.isElectronOnly || electron)
      .map(driver => ({
        value: driver.engine,
        label: driver.title,
      })),
  ]}
/>

{#if driver?.showConnectionField('databaseFile', $values)}
  <FormElectronFileSelector label="Database file" name="databaseFile" disabled={isConnected || !electron} />
{/if}

{#if driver?.showConnectionField('useDatabaseUrl', $values)}
  <div class="radio">
    <FormRadioGroupField
      disabled={isConnected}
      name="useDatabaseUrl"
      options={[
        { label: 'Fill database connection details', value: '', default: true },
        { label: 'Use database URL', value: '1' },
      ]}
    />
  </div>
{/if}

{#if driver?.showConnectionField('databaseUrl', $values)}
  <FormTextField
    label="Database URL"
    name="databaseUrl"
    placeholder={driver?.databaseUrlPlaceholder}
    disabled={isConnected}
  />
{/if}

{#if $authTypes && driver?.showConnectionField('authType', $values)}
  <FormSelectField
    label={driver?.authTypeLabel ?? 'Authentication'}
    name="authType"
    isNative
    disabled={isConnected}
    defaultValue={driver?.defaultAuthTypeName}
    options={$authTypes.map(auth => ({
      value: auth.name,
      label: auth.title,
    }))}
  />
{/if}

{#if driver?.showConnectionField('server', $values)}
  <div class="row">
    <div class="col-9 mr-1">
      <FormTextField
        label="Server"
        name="server"
        disabled={isConnected || disabledFields.includes('server')}
        templateProps={{ noMargin: true }}
      />
    </div>
    {#if driver?.showConnectionField('port', $values)}
      <div class="col-3 mr-1">
        <FormTextField
          label="Port"
          name="port"
          disabled={isConnected || disabledFields.includes('port')}
          templateProps={{ noMargin: true }}
          placeholder={driver?.defaultPort}
        />
      </div>
    {/if}
  </div>
  {#if getCurrentConfig().isDocker}
    <div class="row">
      <FontIcon icon="img warn" padRight />
      Under docker, localhost and 127.0.0.1 will not work, use dockerhost instead
    </div>
  {/if}
{/if}

{#if driver?.showConnectionField('serviceName', $values)}
  <FormTextField label="Service name" name="serviceName" disabled={isConnected} />
{/if}

{#if driver?.showConnectionField('socketPath', $values)}
  <FormTextField
    label="Socket path"
    name="socketPath"
    disabled={isConnected || disabledFields.includes('socketPath')}
    placeholder={driver?.defaultSocketPath}
  />
{/if}

{#if showUser && showPassword}
  <div class="row">
    {#if showUser}
      <div class="col-6 mr-1">
        <FormTextField
          label="User"
          name="user"
          disabled={isConnected || disabledFields.includes('user')}
          templateProps={{ noMargin: true }}
        />
      </div>
    {/if}
    {#if showPassword}
      <div class="col-6 mr-1">
        <FormPasswordField
          label="Password"
          name="password"
          disabled={isConnected || disabledFields.includes('password')}
          templateProps={{ noMargin: true }}
        />
      </div>
    {/if}
  </div>
{/if}
{#if showUser && !showPassword}
  <FormTextField label="User" name="user" disabled={isConnected || disabledFields.includes('user')} />
{/if}
{#if !showUser && showPassword}
  <FormPasswordField label="Password" name="password" disabled={isConnected || disabledFields.includes('password')} />
{/if}

{#if !disabledFields.includes('password') && showPasswordMode}
  <FormSelectField
    label="Password mode"
    isNative
    name="passwordMode"
    defaultValue="saveEncrypted"
    disabled={isConnected}
    options={[
      { value: 'saveEncrypted', label: 'Save and encrypt' },
      { value: 'saveRaw', label: 'Save raw (UNSAFE!!)' },
      { value: 'askPassword', label: "Don't save, ask for password" },
      { value: 'askUser', label: "Don't save, ask for login and password" },
    ]}
  />
{/if}

{#if driver?.showConnectionField('treeKeySeparator', $values)}
  <FormTextField label="Key separator" name="treeKeySeparator" disabled={isConnected} placeholder=":" />
{/if}

{#if driver?.showConnectionField('windowsDomain', $values)}
  <FormTextField label="Domain (specify to use NTLM authentication)" name="windowsDomain" disabled={isConnected} />
{/if}

{#if driver?.showConnectionField('isReadOnly', $values)}
  <FormCheckboxField label="Is read only" name="isReadOnly" disabled={isConnected} />
{/if}

{#if driver?.showConnectionField('trustServerCertificate', $values)}
  <FormCheckboxField label="Trust server certificate" name="trustServerCertificate" disabled={isConnected} />
{/if}

{#if driver?.showConnectionField('defaultDatabase', $values)}
  <FormTextField label="Default database" name="defaultDatabase" disabled={isConnected} />
{/if}

{#if defaultDatabase && driver?.showConnectionField('singleDatabase', $values)}
  <FormCheckboxField label={`Use only database ${defaultDatabase}`} name="singleDatabase" disabled={isConnected} />
{/if}

{#if driver}
  <div class="row">
    <div class="col-6 mr-1">
      <FormTextField
        label="Display name"
        name="displayName"
        templateProps={{ noMargin: true }}
        disabled={isConnected}
      />
    </div>
    <div class="col-6 mr-1">
      <FormColorField
        useSelector
        label="Color"
        name="connectionColor"
        emptyLabel="(not selected)"
        templateProps={{ noMargin: true }}
        disabled={isConnected}
      />
    </div>
  </div>
{/if}

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
