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

  const { values, setFieldValue } = getFormContext();
  const electron = getElectron();

  $: useSshTunnel = $values.useSshTunnel;
  $: platformInfo = usePlatformInfo();

  $: {
    if (!$values.sshMode) setFieldValue('sshMode', 'userPassword');
    if (!$values.sshPort) setFieldValue('sshPort', '22');
    if (!$values.sshKeyfile && $platformInfo) setFieldValue('sshKeyfile', $platformInfo.defaultKeyFile);
  }
</script>

<FormCheckboxField label="Use SSH tunnel" name="useSshTunnel" />

<div class="row">
  <div class="col-9 mr-1">
    <FormTextField label="Host" name="sshHost" disabled={!useSshTunnel} templateProps={{ noMargin: true }} />
  </div>
  <div class="col-3">
    <FormTextField label="Port" name="sshPort" disabled={!useSshTunnel} templateProps={{ noMargin: true }} />
  </div>
</div>
<FormTextField label="Bastion host (Jump host)" name="sshBastionHost" disabled={!useSshTunnel} />

<FormSelectField
  label="SSH Authentication"
  name="sshMode"
  disabled={!useSshTunnel}
  options={[
    { value: 'userPassword', label: 'Username & password' },
    { value: 'agent', label: 'SSH agent' },
    electron && { value: 'keyFile', label: 'Key file' },
  ]}
/>

{#if $values.sshMode != 'userPassword'}
  <FormTextField label="Login" name="sshLogin" disabled={!useSshTunnel} />
{/if}

{#if $values.sshMode == 'userPassword'}
  <div class="row">
    <div class="col-6 mr-1">
      <FormTextField label="Login" name="sshLogin" disabled={!useSshTunnel} templateProps={{ noMargin: true }} />
    </div>
    <div class="col-6">
      <FormPasswordField
        label="Password"
        name="sshPassword"
        disabled={!useSshTunnel}
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
        disabled={!useSshTunnel}
        templateProps={{ noMargin: true }}
      />
    </div>
    <div class="col-6">
      <FormPasswordField
        label="Key file passphrase"
        name="sshKeyfilePassword"
        disabled={!useSshTunnel}
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
