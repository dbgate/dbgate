<script lang="ts">
  import { getFormContext } from '../forms/FormProviderCore.svelte';
  import FormSelectField from '../forms/FormSelectField.svelte';

  import FormTextField from '../forms/FormTextField.svelte';
  import { extensions } from '../stores';
  import { useAuthTypes } from '../utility/metadataLoaders';

  const { values } = getFormContext();
  $: authType = $values.authType;
  $: engine = $values.engine;
  $: authTypes = useAuthTypes({ engine });
  $: currentAuthType = $authTypes && $authTypes.find(x => x.name == authType);
  $: disabledFields = (currentAuthType ? currentAuthType.disabledFields : null) || [];
  $: driver = $extensions.drivers.find(x => x.engine == engine);
</script>

<FormSelectField
  label="Database engine"
  name="engine"
  options={[
    { label: '(select driver)', value: '' },
    ...$extensions.drivers.map(driver => ({
      value: driver.engine,
      label: driver.title,
    })),
  ]}
/>

<div class="row">
  <div class="col-9 mr-1">
    <FormTextField
      label="Server"
      name="server"
      disabled={disabledFields.includes('server')}
      templateProps={{ noMargin: true }}
    />
  </div>
  <div class="col-3 mr-1">
    <FormTextField
      label="Port"
      name="port"
      disabled={disabledFields.includes('port')}
      templateProps={{ noMargin: true }}
      placeholder={driver && driver.defaultPort}
    />
  </div>
</div>

<style>
  .row {
    margin: var(--dim-large-form-margin);
    display: flex;
  }
</style>
