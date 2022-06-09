<script lang="ts">
  import FormElectronFileSelector from '../forms/FormElectronFileSelector.svelte';

  import FormPasswordField from '../forms/FormPasswordField.svelte';

  import { getFormContext } from '../forms/FormProviderCore.svelte';
  import FormSelectField from '../forms/FormSelectField.svelte';

  import FormTextField from '../forms/FormTextField.svelte';
  import FormCheckboxField from '../forms/FormCheckboxField.svelte';
  import getElectron from '../utility/getElectron';
  import { usePlatformInfo } from '../utility/metadataLoaders';
  import FontIcon from '../icons/FontIcon.svelte';
  import { extensions, openedConnections, openedSingleDatabaseConnections } from '../stores';

  const { values, setFieldValue } = getFormContext();
  const electron = getElectron();

  $: useSshTunnel = $values.useSshTunnel;
  $: platformInfo = usePlatformInfo();

  $: {
    if (!$values.sshMode) setFieldValue('sshMode', 'userPassword');
    // if (!$values.sshPort) setFieldValue('sshPort', '22');
    if (!$values.sshKeyfile && $platformInfo) setFieldValue('sshKeyfile', $platformInfo.defaultKeyfile);
  }

  $: isConnected = $openedConnections.includes($values._id) || $openedSingleDatabaseConnections.includes($values._id);
</script>

<FormCheckboxField label="Use SSH tunnel" name="useSshTunnel" disabled={isConnected} />

<div class="row">
  <div class="col-9 mr-1">
    <FormTextField
      label="Host"
      name="sshHost"
      disabled={isConnected || !useSshTunnel}
      templateProps={{ noMargin: true }}
    />
  </div>
  <div class="col-3">
    <FormTextField
      label="Port"
      name="sshPort"
      disabled={isConnected || !useSshTunnel}
      templateProps={{ noMargin: true }}
      placeholder="22"
    />
  </div>
</div>
<FormTextField label="Bastion host (Jump host)" name="sshBastionHost" disabled={isConnected || !useSshTunnel} />

<FormSelectField
  label="SSH Authentication"
  name="sshMode"
  isNative
  disabled={isConnected || !useSshTunnel}
  options={[
    { value: 'userPassword', label: 'Username & password' },
    { value: 'agent', label: 'SSH agent' },
    electron && { value: 'keyFile', label: 'Key file' },
  ]}
/>

{#if $values.sshMode != 'userPassword'}
  <FormTextField label="Login" name="sshLogin" disabled={isConnected || !useSshTunnel} />
{/if}

{#if $values.sshMode == 'userPassword'}
  <div class="row">
    <div class="col-6 mr-1">
      <FormTextField
        label="Login"
        name="sshLogin"
        disabled={isConnected || !useSshTunnel}
        templateProps={{ noMargin: true }}
      />
    </div>
    <div class="col-6">
      <FormPasswordField
        label="Password"
        name="sshPassword"
        disabled={isConnected || !useSshTunnel}
        templateProps={{ noMargin: true }}
      />
    </div>
  </div>
{/if}

{#if $values.sshMode == 'keyFile'}
  <div class="row">
    <div class="col-6 mr-1">
      <FormElectronFileSelector
        label="Private key file"
        name="sshKeyfile"
        disabled={isConnected || !useSshTunnel}
        templateProps={{ noMargin: true }}
      />
    </div>
    <div class="col-6">
      <FormPasswordField
        label="Key file passphrase"
        name="sshKeyfilePassword"
        disabled={isConnected || !useSshTunnel}
        templateProps={{ noMargin: true }}
      />
    </div>
  </div>
{/if}

{#if useSshTunnel && $values.sshMode == 'agent'}
  <div class="ml-3 mb-3">
    {#if $platformInfo && $platformInfo.sshAuthSock}
      <FontIcon icon="img ok" /> SSH Agent found
    {:else}
      <FontIcon icon="img error" /> SSH Agent not found
    {/if}
  </div>
{/if}

<style>
  .row {
    margin: var(--dim-large-form-margin);
    display: flex;
  }
</style>
