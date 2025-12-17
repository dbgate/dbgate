<script lang="ts">
  import FormTextField from '../forms/FormTextField.svelte';
  import { extensions, openedConnections, openedSingleDatabaseConnections } from '../stores';
  import { getFormContext } from '../forms/FormProviderCore.svelte';
  import FormTextAreaField from '../forms/FormTextAreaField.svelte';
  import FormArgumentList from '../forms/FormArgumentList.svelte';
  import { _t } from '../translations';

  export let isFormReadOnly;

  const { values } = getFormContext();

  $: engine = $values.engine;

  $: driver = $extensions.drivers.find(x => x.engine == engine);

  $: isConnected = $openedConnections.includes($values._id) || $openedSingleDatabaseConnections.includes($values._id);

  $: advancedFields = driver?.getAdvancedConnectionFields ? driver?.getAdvancedConnectionFields() : null;
</script>

<FormTextAreaField
  label={_t('connection.allowedDatabases', { defaultMessage: 'Allowed databases, one per line' })}
  name="allowedDatabases"
  disabled={isConnected || isFormReadOnly}
  rows={8}
/>
<FormTextField
  label={_t('connection.allowedDatabasesRegex', { defaultMessage: 'Allowed databases regular expression' })}
  name="allowedDatabasesRegex"
  disabled={isConnected || isFormReadOnly}
/>

{#if advancedFields}
  <FormArgumentList args={advancedFields} isReadOnly={isFormReadOnly} />
{/if}
