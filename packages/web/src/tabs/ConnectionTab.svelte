<script lang="ts">
  import registerCommand from '../commands/registerCommand';
  import FormButton from '../forms/FormButton.svelte';
  import FormProvider from '../forms/FormProvider.svelte';
  import FormSubmit from '../forms/FormSubmit.svelte';
  import FontIcon from '../icons/FontIcon.svelte';
  import TabControl from '../elements/TabControl.svelte';
  import ConnectionModalDriverFields from '../modals/ConnectionModalDriverFields.svelte';
  import ConnectionModalSshTunnelFields from '../modals/ConnectionModalSshTunnelFields.svelte';
  import ConnectionModalSslFields from '../modals/ConnectionModalSslFields.svelte';
  import FormFieldTemplateLarge from '../forms/FormFieldTemplateLarge.svelte';

  import ModalBase from '../modals/ModalBase.svelte';
  import { closeCurrentModal, closeModal, showModal } from '../modals/modalTools';
  import createRef from '../utility/createRef';
  import Link from '../elements/Link.svelte';
  import ErrorMessageModal from '../modals/ErrorMessageModal.svelte';
  import { writable } from 'svelte/store';
  import FormProviderCore from '../forms/FormProviderCore.svelte';
  import { extensions, getCurrentConfig } from '../stores';
  import _ from 'lodash';
  import { getDatabaseFileLabel } from '../utility/getConnectionLabel';
  import { apiCall } from '../utility/api';

  export let connection;

  let isTesting;
  let sqlConnectResult;

  const values = writable(
    connection || {
      server: getCurrentConfig().isDocker ? 'dockerhost' : 'localhost',
      engine: '',
    }
  );

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

  async function handleSave(e) {
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
    const visibleProps = allProps.filter(x => driver?.showConnectionField(x, $values));
    const omitProps = _.difference(allProps, visibleProps);
    if (!$values.defaultDatabase) omitProps.push('singleDatabase');

    let connection = _.omit(e.detail, omitProps);
    if (driver?.beforeConnectionSave) connection = driver?.beforeConnectionSave(connection);

    apiCall('connections/save', connection);
    closeCurrentModal();
  }

  async function handleConnect() {}
</script>

<FormProviderCore template={FormFieldTemplateLarge} {values}>
  <div class="wrapper">
    <TabControl
      isInline
      containerMaxWidth="800px"
      flex1={false}
      tabs={[
        {
          label: 'General',
          component: ConnectionModalDriverFields,
        },
        (driver?.showConnectionTab('sshTunnel', $values)) && {
          label: 'SSH Tunnel',
          component: ConnectionModalSshTunnelFields,
        },
        (driver?.showConnectionTab('ssl', $values)) && {
          label: 'SSL',
          component: ConnectionModalSslFields,
        },
      ]}
    />

    {#if driver}
      <div class="flex">
        <div class="buttons">
          <FormButton value="Connect" on:click={handleConnect} />
          {#if isTesting}
            <FormButton value="Cancel test" on:click={handleCancelTest} />
          {:else}
          <FormButton value="Test" on:click={handleTest} />
          {/if}
          <FormButton value="Save" on:click={handleSave} />
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
    {/if}
  </div>
</FormProviderCore>

<style>
  .wrapper {
    flex: 1;
    display: flex;
    flex-direction: column;
  }

  .buttons {
    flex-shrink: 0;
    margin: var(--dim-large-form-margin);
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
