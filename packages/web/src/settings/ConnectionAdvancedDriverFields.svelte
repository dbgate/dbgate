<script lang="ts">
  import FormTextField from '../forms/FormTextField.svelte';
  import FormPasswordField from '../forms/FormPasswordField.svelte';
  import { extensions, openedConnections, openedSingleDatabaseConnections } from '../stores';
  import { getFormContext } from '../forms/FormProviderCore.svelte';
  import FormTextAreaField from '../forms/FormTextAreaField.svelte';
  import FormArgumentList from '../forms/FormArgumentList.svelte';
  import { _t } from '../translations';
  import { useConfig } from '../utility/metadataLoaders';

  export let isFormReadOnly;

  const { values } = getFormContext();

  $: engine = $values.engine;

  $: driver = $extensions.drivers.find(x => x.engine == engine);

  $: isConnected = $openedConnections.includes($values._id) || $openedSingleDatabaseConnections.includes($values._id);

  $: advancedFields = driver?.getAdvancedConnectionFields ? driver?.getAdvancedConnectionFields() : null;

  $: config = useConfig();

  $: showConnectionFieldArgs = { config: $config };

  $: showAllowedDatabases =
    driver?.showConnectionField?.('allowedDatabases', $values, showConnectionFieldArgs) === true;
  $: showProxy = driver?.showConnectionField?.('httpProxyUrl', $values, showConnectionFieldArgs) === true;
</script>

{#if showAllowedDatabases}
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
{/if}

{#if showProxy}
  <FormTextField
    label={_t('connection.httpProxyUrl', { defaultMessage: 'HTTP Proxy URL' })}
    name="httpProxyUrl"
    data-testid="ConnectionDriverFields_httpProxyUrl"
    placeholder="http://proxy.example.com:8080"
    disabled={isConnected || isFormReadOnly}
  />
  <div class="row">
    <div class="col-6 mr-1">
      <FormTextField
        label={_t('connection.httpProxyUser', { defaultMessage: 'HTTP Proxy User' })}
        name="httpProxyUser"
        data-testid="ConnectionDriverFields_httpProxyUser"
        disabled={isConnected || isFormReadOnly}
        templateProps={{ noMargin: true }}
      />
    </div>
    <div class="col-6 mr-1">
      <FormPasswordField
        label={_t('connection.httpProxyPassword', { defaultMessage: 'HTTP Proxy Password' })}
        name="httpProxyPassword"
        data-testid="ConnectionDriverFields_httpProxyPassword"
        disabled={isConnected || isFormReadOnly}
        templateProps={{ noMargin: true }}
      />
    </div>
  </div>
{/if}

{#if advancedFields}
  <FormArgumentList args={advancedFields} isReadOnly={isFormReadOnly} />
{/if}

<style>
  .row {
    margin: var(--dim-large-form-margin);
    display: flex;
  }
  .col-6 {
    flex: 1;
  }
</style>
