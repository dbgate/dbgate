<script lang="ts">
  import FormTextField from '../forms/FormTextField.svelte';
  import { extensions, openedConnections, openedSingleDatabaseConnections } from '../stores';
  import { getFormContext } from '../forms/FormProviderCore.svelte';
  import FormTextAreaField from '../forms/FormTextAreaField.svelte';
  import FormArgumentList from '../forms/FormArgumentList.svelte';

  const { values } = getFormContext();

  $: engine = $values.engine;

  $: driver = $extensions.drivers.find(x => x.engine == engine);

  $: isConnected = $openedConnections.includes($values._id) || $openedSingleDatabaseConnections.includes($values._id);

  $: advancedFields = driver?.getAdvancedConnectionFields ? driver?.getAdvancedConnectionFields() : null;
</script>

<FormTextAreaField label="Allowed databases, one per line" name="allowedDatabases" disabled={isConnected} rows={8} />
<FormTextField label="Allowed databases regular expression" name="allowedDatabasesRegex" disabled={isConnected} />

{#if advancedFields}
  <FormArgumentList args={advancedFields} />
{/if}
