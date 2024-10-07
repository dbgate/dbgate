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
  import { useAuthTypes, useConfig } from '../utility/metadataLoaders';
  import FormColorField from '../forms/FormColorField.svelte';
  import FontIcon from '../icons/FontIcon.svelte';
  import FormDropDownTextField from '../forms/FormDropDownTextField.svelte';

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
  $: config = useConfig();

  $: showConnectionFieldArgs = { config: $config };

  $: showUser =
    driver?.showConnectionField('user', $values, showConnectionFieldArgs) && $values.passwordMode != 'askUser';
  $: showPassword =
    driver?.showConnectionField('password', $values, showConnectionFieldArgs) &&
    $values.passwordMode != 'askPassword' &&
    $values.passwordMode != 'askUser';
  $: showPasswordMode = driver?.showConnectionField('password', $values, showConnectionFieldArgs);
  $: isConnected = $openedConnections.includes($values._id) || $openedSingleDatabaseConnections.includes($values._id);

  const awsRegions = [
    'us-east-1',
    'us-east-2',
    'us-west-1',
    'us-west-2',
    'af-south-1',
    'ap-east-1',
    'ap-south-1',
    'ap-northeast-1',
    'ap-northeast-2',
    'ap-northeast-3',
    'ap-southeast-1',
    'ap-southeast-2',
    'ap-southeast-3',
    'ca-central-1',
    'cn-north-1',
    'cn-northwest-1',
    'eu-central-1',
    'eu-west-1',
    'eu-west-2',
    'eu-west-3',
    'eu-north-1',
    'eu-south-1',
    'eu-south-2',
    'me-south-1',
    'me-central-1',
    'sa-east-1',
  ];
</script>

<FormSelectField
  label="Connection type"
  name="engine"
  isNative
  disabled={isConnected}
  options={[
    { label: '(select connection type)', value: '' },
    ..._.sortBy(
      $extensions.drivers
        .filter(driver => !driver.isElectronOnly || electron)
        .map(driver => ({
          value: driver.engine,
          label: driver.title,
        })),
      'label'
    ),
  ]}
/>

{#if driver?.showConnectionField('databaseFile', $values, showConnectionFieldArgs)}
  <FormElectronFileSelector
    label="Database file"
    name="databaseFile"
    disabled={isConnected || !electron || disabledFields.includes('databaseFile')}
  />
{/if}

{#if driver?.showConnectionField('useDatabaseUrl', $values, showConnectionFieldArgs)}
  <div class="radio">
    <FormRadioGroupField
      disabled={isConnected || disabledFields.includes('useDatabaseUrl')}
      name="useDatabaseUrl"
      matchValueToOption={(value, option) => !!option.value == !!value}
      options={[
        { label: 'Fill database connection details', value: '', default: true },
        { label: 'Use database URL', value: '1' },
      ]}
    />
  </div>
{/if}

{#if driver?.showConnectionField('databaseUrl', $values, showConnectionFieldArgs)}
  <FormTextField
    label="Database URL"
    name="databaseUrl"
    placeholder={driver?.databaseUrlPlaceholder}
    disabled={isConnected || disabledFields.includes('databaseUrl')}
  />
{/if}

{#if $authTypes && driver?.showConnectionField('authType', $values, showConnectionFieldArgs)}
  {#key $authTypes}
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
  {/key}
{/if}

{#if driver?.showConnectionField('endpoint', $values, showConnectionFieldArgs)}
  <FormTextField label="Endpoint" name="endpoint" disabled={isConnected || disabledFields.includes('endpoint')} />
{/if}

{#if driver?.showConnectionField('endpointKey', $values, showConnectionFieldArgs)}
  <FormTextField label="Key" name="endpointKey" disabled={isConnected || disabledFields.includes('endpointKey')} />
{/if}

{#if driver?.showConnectionField('clientLibraryPath', $values, showConnectionFieldArgs)}
  <FormTextField
    label="Client library path"
    name="clientLibraryPath"
    disabled={isConnected || disabledFields.includes('clientLibraryPath')}
  />
{/if}

{#if driver?.showConnectionField('server', $values, showConnectionFieldArgs)}
  <div class="row">
    <div class="col-9 mr-1">
      <FormTextField
        label="Server"
        name="server"
        disabled={isConnected || disabledFields.includes('server')}
        templateProps={{ noMargin: true }}
      />
    </div>
    {#if driver?.showConnectionField('port', $values, showConnectionFieldArgs)}
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

{#if driver?.showConnectionField('serviceName', $values, showConnectionFieldArgs)}
  <div class="row">
    <div class="col-9 mr-1">
      <FormTextField
        label={$values.serviceNameType == 'sid' ? 'SID' : 'Service name'}
        name="serviceName"
        disabled={isConnected}
        templateProps={{ noMargin: true }}
      />
    </div>
    <div class="col-3">
      <FormSelectField
        label="Choose type"
        isNative
        name="serviceNameType"
        defaultValue="serviceName"
        disabled={isConnected}
        templateProps={{ noMargin: true }}
        options={[
          { value: 'serviceName', label: 'Service name' },
          { value: 'sid', label: 'SID' },
        ]}
      />
    </div>
  </div>
{/if}

{#if driver?.showConnectionField('socketPath', $values, showConnectionFieldArgs)}
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

{#if driver?.showConnectionField('awsRegion', $values, showConnectionFieldArgs)}
  <FormDropDownTextField
    label="AWS Region"
    name="awsRegion"
    menu={() => {
      return awsRegions.map(region => ({
        text: region,
        onClick: () => {
          $values.awsRegion = region;
        },
      }));
    }}
  />
{/if}

<div class="row">
  {#if driver?.showConnectionField('accessKeyId', $values, showConnectionFieldArgs)}
    <div class="col-6 mr-1">
      <FormTextField
        label="Access Key ID"
        name="awsAccessKeyId"
        disabled={isConnected || disabledFields.includes('accessKeyId')}
        templateProps={{ noMargin: true }}
      />
    </div>
  {/if}
  {#if driver?.showConnectionField('secretAccessKey', $values, showConnectionFieldArgs)}
    <div class="col-6 mr-1">
      <FormPasswordField
        label="Secret access key"
        name="secretAccessKey"
        disabled={isConnected || disabledFields.includes('secretAccessKey')}
        templateProps={{ noMargin: true }}
      />
    </div>
  {/if}
</div>

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

{#if driver?.showConnectionField('treeKeySeparator', $values, showConnectionFieldArgs)}
  <FormTextField label="Key separator" name="treeKeySeparator" disabled={isConnected} placeholder=":" />
{/if}

{#if driver?.showConnectionField('windowsDomain', $values, showConnectionFieldArgs)}
  <FormTextField label="Domain (specify to use NTLM authentication)" name="windowsDomain" disabled={isConnected} />
{/if}

{#if driver?.showConnectionField('isReadOnly', $values, showConnectionFieldArgs)}
  <FormCheckboxField label="Is read only" name="isReadOnly" disabled={isConnected} />
{/if}

{#if driver?.showConnectionField('trustServerCertificate', $values, showConnectionFieldArgs)}
  <FormCheckboxField label="Trust server certificate" name="trustServerCertificate" disabled={isConnected} />
{/if}

{#if driver?.showConnectionField('defaultDatabase', $values, showConnectionFieldArgs)}
  <FormTextField label="Default database" name="defaultDatabase" disabled={isConnected} />
{/if}

{#if defaultDatabase && driver?.showConnectionField('singleDatabase', $values, showConnectionFieldArgs)}
  <FormCheckboxField label={`Use only database ${defaultDatabase}`} name="singleDatabase" disabled={isConnected} />
{/if}

{#if driver?.showConnectionField('useSeparateSchemas', $values, showConnectionFieldArgs)}
  <FormCheckboxField
    label={`Use schemas separately (use this if you have many large schemas)`}
    name="useSeparateSchemas"
    disabled={isConnected}
  />
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
