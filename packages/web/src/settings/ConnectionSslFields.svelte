<script lang="ts">
  import FormElectronFileSelector from '../forms/FormElectronFileSelector.svelte';

  import { getFormContext } from '../forms/FormProviderCore.svelte';

  import FormCheckboxField from '../forms/FormCheckboxField.svelte';
  import getElectron from '../utility/getElectron';
  import FormPasswordField from '../forms/FormPasswordField.svelte';
  import { openedConnections, openedSingleDatabaseConnections } from '../stores';
  import { _t } from '../translations';

  export let isFormReadOnly;

  const { values, setFieldValue } = getFormContext();
  const electron = getElectron();

  $: useSsl = $values.useSsl;
  $: isConnected = $openedConnections.includes($values._id) || $openedSingleDatabaseConnections.includes($values._id);
</script>

<FormCheckboxField
  label={_t('connection.ssl.use', { defaultMessage: 'Use SSL' })}
  name="useSsl"
  disabled={isConnected || isFormReadOnly}
/>
<FormElectronFileSelector
  label={_t('connection.ssl.caCert', { defaultMessage: 'CA Cert (optional)' })}
  name="sslCaFile"
  disabled={isConnected || !useSsl || !electron || isFormReadOnly}
/>
<FormElectronFileSelector
  label={_t('connection.ssl.certificate', { defaultMessage: 'Certificate (optional)' })}
  name="sslCertFile"
  disabled={isConnected || !useSsl || !electron || isFormReadOnly}
/>
<FormPasswordField
  label={_t('connection.ssl.certificateKeyFilePassword', {
    defaultMessage: 'Certificate key file password (optional)',
  })}
  name="sslCertFilePassword"
  disabled={isConnected || !useSsl || !electron || isFormReadOnly}
/>
<FormElectronFileSelector
  label={_t('connection.ssl.keyFile', { defaultMessage: 'Key file (optional)' })}
  name="sslKeyFile"
  disabled={isConnected || !useSsl || !electron || isFormReadOnly}
/>
<FormCheckboxField
  label={_t('connection.ssl.rejectUnauthorized', { defaultMessage: 'Reject unauthorized' })}
  name="sslRejectUnauthorized"
  disabled={isConnected || !useSsl || isFormReadOnly}
/>
