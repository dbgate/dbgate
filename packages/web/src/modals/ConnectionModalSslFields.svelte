<script lang="ts">
  import FormElectronFileSelector from '../forms/FormElectronFileSelector.svelte';

  import { getFormContext } from '../forms/FormProviderCore.svelte';

  import FormCheckboxField from '../forms/FormCheckboxField.svelte';
  import getElectron from '../utility/getElectron';

  const { values, setFieldValue } = getFormContext();
  const electron = getElectron();

  $: useSsl = $values.useSsl;
</script>

<FormCheckboxField label="Use SSL" name="useSsl" />
<FormElectronFileSelector label="CA Cert (optional)" name="sslCaFile" disabled={!useSsl || !electron} />
<FormElectronFileSelector label="Certificate (optional)" name="sslCertFile" disabled={!useSsl || !electron} />
<FormElectronFileSelector label="Key file (optional)" name="sslKeyFile" disabled={!useSsl || !electron} />
<FormCheckboxField label="Reject unauthorized" name="sslRejectUnauthorized" disabled={!useSsl} />
