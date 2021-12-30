<script lang="ts">
  import registerCommand from '../commands/registerCommand';
  import FormButton from '../forms/FormButton.svelte';
  import FormProvider from '../forms/FormProvider.svelte';
  import FormSubmit from '../forms/FormSubmit.svelte';
  import FontIcon from '../icons/FontIcon.svelte';
  import TabControl from '../elements/TabControl.svelte';
  import ConnectionModalDriverFields from './ConnectionModalDriverFields.svelte';
  import ConnectionModalSshTunnelFields from './ConnectionModalSshTunnelFields.svelte';
  import ConnectionModalSslFields from './ConnectionModalSslFields.svelte';
  import FormFieldTemplateLarge from '../forms/FormFieldTemplateLarge.svelte';

  import ModalBase from './ModalBase.svelte';
  import { closeCurrentModal, closeModal, showModal } from './modalTools';
  import createRef from '../utility/createRef';
  import Link from '../elements/Link.svelte';
  import ErrorMessageModal from './ErrorMessageModal.svelte';
  import { writable } from 'svelte/store';
  import FormProviderCore from '../forms/FormProviderCore.svelte';
  import { extensions } from '../stores';
  import _ from 'lodash';
  import { getDatabaseFileLabel } from '../utility/getConnectionLabel';
  import { apiCall } from '../utility/api';

  export let connection;

  let isTesting;
  let sqlConnectResult;

  const values = writable(connection || { server: 'localhost', engine: 'mssql@dbgate-plugin-mssql' });

  $: engine = $values.engine;
  $: driver = $extensions.drivers.find(x => x.engine == engine);

  const testIdRef = createRef(0);

  async function handleTest(e) {
    isTesting = true;
    testIdRef.update(x => x + 1);
    const testid = testIdRef.get();
    const resp = await apiCall('connections/test', e.detail);
    if (testIdRef.get() != testid) return;

    isTesting = false;
    sqlConnectResult = resp;
  }

  function handleCancelTest() {
    testIdRef.update(x => x + 1); // invalidate current test
    isTesting = false;
  }

  async function handleSubmit(e) {
    const allProps = [
      'databaseFile',
      'useDatabaseUrl',
      'databaseUrl',
      'authType',
      'server',
      'port',
      'user',
      'password',
      'defaultDatabase',
      'singleDatabase',
    ];
    const visibleProps = allProps.filter(x => !driver?.showConnectionField || driver.showConnectionField(x, $values));
    const omitProps = _.difference(allProps, visibleProps);
    if (!$values.defaultDatabase) omitProps.push('singleDatabase');

    let connection = _.omit(e.detail, omitProps);
    if (driver?.beforeConnectionSave) connection = driver?.beforeConnectionSave(connection);

    apiCall('connections/save', connection);
    closeCurrentModal();
  }
</script>

<FormProviderCore template={FormFieldTemplateLarge} {values}>
  <ModalBase {...$$restProps} noPadding>
    <div slot="header">Add connection</div>

    <TabControl
      isInline
      tabs={[
        {
          label: 'Main',
          component: ConnectionModalDriverFields,
        },
        (!driver?.showConnectionTab || driver?.showConnectionTab('sshTunnel', $values)) && {
          label: 'SSH Tunnel',
          component: ConnectionModalSshTunnelFields,
        },
        (!driver?.showConnectionTab || driver?.showConnectionTab('ssl', $values)) && {
          label: 'SSL',
          component: ConnectionModalSslFields,
        },
      ]}
    />

    <div slot="footer" class="flex">
      <div class="buttons">
        {#if isTesting}
          <FormButton value="Cancel test" on:click={handleCancelTest} />
        {:else}
          <FormButton value="Test" on:click={handleTest} />
        {/if}
        <FormSubmit value="Save" on:click={handleSubmit} />
      </div>
      <div class="test-result">
        {#if !isTesting && sqlConnectResult && sqlConnectResult.msgtype == 'connected'}
          <div>
            Connected: <FontIcon icon="img ok" />
            {sqlConnectResult.version}
          </div>
        {/if}
        {#if !isTesting && sqlConnectResult && sqlConnectResult.msgtype == 'error'}
          <div class="error-result">
            Connect failed: <FontIcon icon="img error" />
            {sqlConnectResult.error}
            <Link
              onClick={() =>
                showModal(ErrorMessageModal, {
                  message: sqlConnectResult.detail,
                  showAsCode: true,
                  title: 'Database connection error',
                })}
            >
              Show detail
            </Link>
          </div>
        {/if}
        {#if isTesting}
          <div>
            <FontIcon icon="icon loading" /> Testing connection
          </div>
        {/if}
      </div>
    </div>
  </ModalBase>
</FormProviderCore>

<style>
  .buttons {
    flex-shrink: 0;
  }

  .test-result {
    margin-left: 10px;
    align-self: center;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .error-result {
    white-space: normal;
  }
</style>
