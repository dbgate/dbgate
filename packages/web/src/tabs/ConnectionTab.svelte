<script lang="ts" context="module">
  export const matchingProps = ['conid'];
</script>

<script lang="ts">
  import FormButton from '../forms/FormButton.svelte';
  import FontIcon from '../icons/FontIcon.svelte';
  import TabControl from '../elements/TabControl.svelte';
  import ConnectionDriverFields from '../settings/ConnectionDriverFields.svelte';
  import ConnectionSshTunnelFields from '../settings/ConnectionSshTunnelFields.svelte';
  import ConnectionSslFields from '../settings/ConnectionSslFields.svelte';
  import FormFieldTemplateLarge from '../forms/FormFieldTemplateLarge.svelte';

  import { showModal } from '../modals/modalTools';
  import createRef from '../utility/createRef';
  import Link from '../elements/Link.svelte';
  import ErrorMessageModal from '../modals/ErrorMessageModal.svelte';
  import { writable } from 'svelte/store';
  import FormProviderCore from '../forms/FormProviderCore.svelte';
  import {
    extensions,
    getCurrentConfig,
    openedConnections,
    openedSingleDatabaseConnections,
    openedTabs,
  } from '../stores';
  import _, { Dictionary } from 'lodash';
  import { apiCall } from '../utility/api';
  import { showSnackbarError, showSnackbarSuccess } from '../utility/snackbar';
  import { changeTab } from '../utility/common';
  import getConnectionLabel from '../utility/getConnectionLabel';
  import { onMount } from 'svelte';
  import { disconnectServerConnection, openConnection } from '../appobj/ConnectionAppObject.svelte';
  import { disconnectDatabaseConnection } from '../appobj/DatabaseAppObject.svelte';

  export let connection;
  export let tabid;
  export let conid;

  let isTesting;
  let sqlConnectResult;

  const values = writable(
    connection || {
      server: getCurrentConfig().isDocker ? 'dockerhost' : 'localhost',
      engine: '',
    }
  );

  // $: console.log('ConnectionTab.$values', $values);
  // $: console.log('ConnectionTab.driver', driver);

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

  function getCurrentConnection() {
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
      'socketPath',
      'serviceName',
    ];
    const visibleProps = allProps.filter(x => driver?.showConnectionField(x, $values));
    const omitProps = _.difference(allProps, visibleProps);
    if (!$values.defaultDatabase) omitProps.push('singleDatabase');

    let connection: Dictionary<string | boolean> = _.omit($values, omitProps);
    if (driver?.beforeConnectionSave) connection = driver?.beforeConnectionSave(connection);

    if (driver?.showConnectionTab('sshTunnel', $values)) {
      if (!$values.useSshTunnel) {
        connection = _.omitBy(connection, (v, k) => k.startsWith('ssh'));
      }
    } else {
      connection = _.omit(connection, ['useSshTunnel']);
      connection = _.omitBy(connection, (v, k) => k.startsWith('ssh'));
    }

    if (driver?.showConnectionTab('ssl', $values)) {
      if (!$values.useSsl) {
        connection = _.omitBy(connection, (v, k) => k.startsWith('ssl'));
      }
    } else {
      connection = _.omit(connection, ['useSsl']);
      connection = _.omitBy(connection, (v, k) => k.startsWith('ssl'));
    }

    return connection;
  }

  async function handleSave() {
    let connection = getCurrentConnection();
    connection = {
      ...connection,
      unsaved: false,
    };
    const saved = await apiCall('connections/save', connection);
    $values = {
      ...$values,
      _id: saved._id,
      unsaved: false,
    };
    changeTab(tabid, tab => ({
      ...tab,
      title: getConnectionLabel(saved),
      props: {
        ...tab.props,
        conid: saved._id,
      },
    }));
    showSnackbarSuccess('Connection saved');
  }

  async function handleConnect() {
    let connection = getCurrentConnection();
    if (!connection._id) {
      connection = {
        ...connection,
        unsaved: true,
      };
    }
    const saved = await apiCall('connections/save', connection);
    $values = {
      ...$values,
      unsaved: connection.unsaved,
      _id: saved._id,
    };
    openConnection(saved);
    // closeMultipleTabs(x => x.tabid == tabid, true);
  }

  async function handleDisconnect() {
    if ($values.singleDatabase) {
      disconnectDatabaseConnection($values._id, $values.defaultDatabase);
    } else {
      disconnectServerConnection($values._id);
    }
  }

  onMount(async () => {
    if (conid) {
      const con = await apiCall('connections/get', { conid });
      if (con) {
        $values = con;
      } else {
        showSnackbarError(`Connection not found: ${conid}`);
      }
    }
  });

  $: isConnected = $openedConnections.includes($values._id) || $openedSingleDatabaseConnections.includes($values._id);

  // $: console.log('CONN VALUES', $values);
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
          component: ConnectionDriverFields,
        },
        driver?.showConnectionTab('sshTunnel', $values) && {
          label: 'SSH Tunnel',
          component: ConnectionSshTunnelFields,
        },
        driver?.showConnectionTab('ssl', $values) && {
          label: 'SSL',
          component: ConnectionSslFields,
        },
      ]}
    />

    {#if driver}
      <div class="flex">
        <div class="buttons">
          {#if isConnected}
            <FormButton value="Disconnect" on:click={handleDisconnect} />
          {:else}
            <FormButton value="Connect" on:click={handleConnect} />
            {#if isTesting}
              <FormButton value="Cancel test" on:click={handleCancelTest} />
            {:else}
              <FormButton value="Test" on:click={handleTest} />
            {/if}
            <FormButton value="Save" on:click={handleSave} />
          {/if}
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
    overflow-y: auto;
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
