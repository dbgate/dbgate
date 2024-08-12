<script lang="ts">
  import FormTextField from '../forms/FormTextField.svelte';
  import { openedConnections, openedSingleDatabaseConnections } from '../stores';
  import { getFormContext } from '../forms/FormProviderCore.svelte';
  import FormTextAreaField from '../forms/FormTextAreaField.svelte';

  const { values } = getFormContext();

  $: isConnected = $openedConnections.includes($values._id) || $openedSingleDatabaseConnections.includes($values._id);
</script>

<FormTextAreaField label="Allowed databases, one per line" name="allowedDatabases" disabled={isConnected} rows={8} />
<FormTextField label="Allowed databases regular expression" name="allowedDatabasesRegex" disabled={isConnected} />
