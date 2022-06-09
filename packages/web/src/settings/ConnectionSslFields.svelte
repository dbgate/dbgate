<script lang="ts">
  import FormElectronFileSelector from '../forms/FormElectronFileSelector.svelte';

  import { getFormContext } from '../forms/FormProviderCore.svelte';

  import FormCheckboxField from '../forms/FormCheckboxField.svelte';
  import getElectron from '../utility/getElectron';
  import FormPasswordField from '../forms/FormPasswordField.svelte';
  import { openedConnections, openedSingleDatabaseConnections } from '../stores';

  const { values, setFieldValue } = getFormContext();
  const electron = getElectron();

  $: useSsl = $values.useSsl;
  $: isConnected = $openedConnections.includes($values._id) || $openedSingleDatabaseConnections.includes($values._id);
</script>

<FormCheckboxField label="Use SSL" name="useSsl" disabled={isConnected} />
<FormElectronFileSelector label="CA Cert (optional)" name="sslCaFile" disabled={isConnected || !useSsl || !electron} />
<FormElectronFileSelector
  label="Certificate (optional)"
  name="sslCertFile"
  disabled={isConnected || !useSsl || !electron}
/>
<FormPasswordField
  label="Certificate key file password (optional)"
  name="sslCertFilePassword"
  disabled={isConnected || !useSsl || !electron}
/>
<FormElectronFileSelector
  label="Key file (optional)"
  name="sslKeyFile"
  disabled={isConnected || !useSsl || !electron}
/>
<FormCheckboxField label="Reject unauthorized" name="sslRejectUnauthorized" disabled={isConnected || !useSsl} />
