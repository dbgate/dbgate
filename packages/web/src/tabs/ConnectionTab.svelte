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
  import { getConnectionLabel } from 'dbgate-tools';
  import { onMount } from 'svelte';
  import { disconnectServerConnection, openConnection } from '../appobj/ConnectionAppObject.svelte';
  import { disconnectDatabaseConnection } from '../appobj/DatabaseAppObject.svelte';
  import { useConfig } from '../utility/metadataLoaders';
  import ConnectionAdvancedDriverFields from '../settings/ConnectionAdvancedDriverFields.svelte';
  import DatabaseLoginModal from '../modals/DatabaseLoginModal.svelte';
  import { _t } from '../translations';

  export let connection;
  export let tabid;
  export let conid;
  export let connectionStore = undefined;

  export let onlyTestButton;

  let isTesting;
  let sqlConnectResult;

  const values =
    connectionStore ||
    writable(
      connection || {
        server: getCurrentConfig().isDocker ? 'dockerhost' : 'localhost',
        engine: '',
      }
    );

  // $: console.log('ConnectionTab.$values', $values);
  // $: console.log('ConnectionTab.driver', driver);

  $: engine = $values.engine;
  $: driver = $extensions.drivers.find(x => x.engine == engine);
  $: config = useConfig();

  const testIdRef = createRef(0);

  function handleTest(requestDbList = false) {
    const connection = getCurrentConnection();
    return new Promise((resolve, reject) => {
      if (connection.passwordMode == 'askPassword' || connection.passwordMode == 'askUser') {
        showModal(DatabaseLoginModal, {
          testedConnection: connection,
          onConnect: conn => handleTestCore(conn, requestDbList).then(res => resolve(res)),
          onCancel: () => resolve(null),
        });
      } else {
        return handleTestCore(connection, requestDbList);
      }
    });
  }

  async function handleTestCore(connection, requestDbList = false) {
    isTesting = true;
    testIdRef.update(x => x + 1);
    const testid = testIdRef.get();
    const resp = await apiCall('connections/test', { connection, requestDbList });
    if (testIdRef.get() != testid) return;

    isTesting = false;
    sqlConnectResult = resp;
    return resp;
  }

  function handleCancelTest() {
    testIdRef.update(x => x + 1); // invalidate current test
    isTesting = false;
  }

  function getCurrentConnection() {
    return getCurrentConnectionCore($values, driver);
  }

  function getCurrentConnectionCore(values, driver) {
    const allProps = [
      'databaseFile',
      'useDatabaseUrl',
      'databaseUrl',
      'authType',
      'server',
      'port',
      'user',
      'password',
      'localDataCenter',
      'defaultDatabase',
      'singleDatabase',
      'socketPath',
      'serviceName',
    ];
    const visibleProps = allProps.filter(x => driver?.showConnectionField(x, values, { config: $config }));
    const omitProps = _.difference(allProps, visibleProps);
    if (!values.defaultDatabase) omitProps.push('singleDatabase');

    let connection: Dictionary<string | boolean> = _.omit(values, omitProps);
    if (driver?.beforeConnectionSave) connection = driver?.beforeConnectionSave(connection);

    if (driver?.showConnectionTab('sshTunnel', values)) {
      if (!values.useSshTunnel) {
        connection = _.omitBy(connection, (v, k) => k.startsWith('ssh'));
      }
    } else {
      connection = _.omit(connection, ['useSshTunnel']);
      connection = _.omitBy(connection, (v, k) => k.startsWith('ssh'));
    }

    if (driver?.showConnectionTab('ssl', values)) {
      if (!values.useSsl) {
        connection = _.omitBy(connection, (v, k) => k.startsWith('ssl'));
      }
    } else {
      connection = _.omit(connection, ['useSsl']);
      connection = _.omitBy(connection, (v, k) => k.startsWith('ssl'));
    }

    if (values?.passwordMode == 'askPassword') {
      connection = _.omit(connection, ['password']);
    }

    if (values?.passwordMode == 'askUser') {
      connection = _.omit(connection, ['user', 'password']);
    }

    return connection;
  }

  $: currentConnection = getCurrentConnectionCore($values, driver);

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

  export function changeConnectionBeforeSave(connection) {
    if (driver?.beforeConnectionSave) return driver.beforeConnectionSave(connection);
    return connection;
  }

  $: isConnected = $openedConnections.includes($values._id) || $openedSingleDatabaseConnections.includes($values._id);

  // $: console.log('CONN VALUES', $values);

  async function getDatabaseList() {
    const resp = await handleTest(true);
    if (resp && resp.msgtype == 'connected') {
      return resp.databases;
    }
    return [];
  }
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
          props: { getDatabaseList, currentConnection },
          testid: 'ConnectionTab_tabGeneral',
        },
        driver?.showConnectionTab('sshTunnel', $values) && {
          label: 'SSH Tunnel',
          component: ConnectionSshTunnelFields,
          testid: 'ConnectionTab_tabSshTunnel',
        },
        driver?.showConnectionTab('ssl', $values) && {
          label: 'SSL',
          component: ConnectionSslFields,
          testid: 'ConnectionTab_tabSsl',
        },
        {
          label: 'Advanced',
          component: ConnectionAdvancedDriverFields,
          testid: 'ConnectionTab_tabAdvanced',
        },
      ]}
    />

    {#if driver}
      <div class="flex">
        <div class="buttons">
          {#if onlyTestButton}
            {#if isTesting}
              <FormButton
                value="Cancel test"
                on:click={handleCancelTest}
                data-testid="ConnectionTab_buttonCancelTest"
              />
            {:else}
              <FormButton
                value="Test connection"
                on:click={() => handleTest(false)}
                data-testid="ConnectionTab_buttonDisconnect"
              />
            {/if}
          {:else if isConnected}
            <FormButton value="Disconnect" on:click={handleDisconnect} data-testid="ConnectionTab_buttonDisconnect" />
          {:else}
            <FormButton value="Connect" on:click={handleConnect} data-testid="ConnectionTab_buttonConnect" />
            {#if isTesting}
              <FormButton value="Cancel test" on:click={handleCancelTest} />
            {:else}
              <FormButton value="Test" on:click={() => handleTest(false)} data-testid="ConnectionTab_buttonTest" />
            {/if}
            <FormButton
              value={_t('common.save', { defaultMessage: 'Save' })}
              on:click={handleSave}
              data-testid="ConnectionTab_buttonSave"
            />
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
