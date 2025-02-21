<script lang="ts" context="module">
  let currentModalConid = null;

  export function isDatabaseLoginVisible() {
    return !!currentModalConid;
  }
</script>

<script lang="ts">
  import _ from 'lodash';
  import { onDestroy, onMount } from 'svelte';
  import { writable } from 'svelte/store';
  import FormStyledButton from '../buttons/FormStyledButton.svelte';
  import Link from '../elements/Link.svelte';
  import FormPasswordField from '../forms/FormPasswordField.svelte';
  import FormProviderCore from '../forms/FormProviderCore.svelte';
  import FormSubmit from '../forms/FormSubmit.svelte';
  import FormTextField from '../forms/FormTextField.svelte';
  import FontIcon from '../icons/FontIcon.svelte';
  import { apiCall, setVolatileConnectionRemapping } from '../utility/api';
  import { batchDispatchCacheTriggers, dispatchCacheChange } from '../utility/cache';
  import createRef from '../utility/createRef';

  import { getConnectionInfo } from '../utility/metadataLoaders';
  import ErrorMessageModal from './ErrorMessageModal.svelte';
  import ModalBase from './ModalBase.svelte';
  import { closeCurrentModal, showModal } from './modalTools';
  import { callServerPing } from '../utility/connectionsPinger';
  import { getConnectionLabel } from 'dbgate-tools';
  import { openedConnections } from '../stores';

  export let conid;
  export let passwordMode;
  export let testedConnection;
  export let onConnect = null;
  export let onCancel = null;

  $: usedPasswordMode = testedConnection?.passwordMode ?? passwordMode;

  const values = writable({});
  let connection;

  let isTesting;
  let sqlConnectResult;
  const testIdRef = createRef(0);

  let engineTitle;
  let closedWithOk = false;

  currentModalConid = conid;

  onMount(async () => {
    if (testedConnection) {
      connection = testedConnection;
    } else {
      connection = await getConnectionInfo({ conid });
    }
    if (usedPasswordMode == 'askPassword') {
      $values = {
        ...$values,
        user: connection.user,
        connectionLabel: getConnectionLabel(connection),
      };
    }
    if (usedPasswordMode == 'askUser') {
      $values = {
        ...$values,
        connectionLabel: getConnectionLabel(connection),
      };
    }

    const match = (connection.engine || '').match(/^([^@]*)@/);
    engineTitle = match ? match[1] : connection.engine;
  });

  onDestroy(() => {
    currentModalConid = null;

    if (!closedWithOk) {
      if (onCancel) onCancel();
      openedConnections.update(x => _.without(x, conid));
    }
  });

  function handleCancelTest() {
    testIdRef.update(x => x + 1); // invalidate current test
    isTesting = false;
  }

  async function handleSubmit(ev) {
    closedWithOk = true;

    if (onConnect) {
      onConnect({
        ...testedConnection,
        user: usedPasswordMode == 'askUser' ? $values['user'] : testedConnection.user,
        password: $values['password'],
      });
      closeCurrentModal();
      return;
    }

    isTesting = true;
    testIdRef.update(x => x + 1);
    const testid = testIdRef.get();
    const resp = await apiCall('connections/save-volatile', {
      conid,
      user: $values['user'],
      password: $values['password'],
      test: true,
    });
    if (testIdRef.get() != testid) return;
    isTesting = false;
    if (resp.msgtype == 'connected') {
      setVolatileConnectionRemapping(conid, resp._id);
      await callServerPing();
      dispatchCacheChange({ key: `server-status-changed` });
      batchDispatchCacheTriggers(x => x.conid == conid);
      closeCurrentModal();
    } else {
      sqlConnectResult = resp;
    }
  }
</script>

<FormProviderCore {values}>
  <ModalBase {...$$restProps} simple>
    <svelte:fragment slot="header">Database Log In ({engineTitle})</svelte:fragment>

    <FormTextField label="Connection" name="connectionLabel" disabled />
    <FormTextField
      label="Username"
      name="user"
      autocomplete="username"
      disabled={usedPasswordMode == 'askPassword'}
      focused={usedPasswordMode == 'askUser'}
      saveOnInput
      data-testid="DatabaseLoginModal_username"
    />
    <FormPasswordField
      label="Password"
      name="password"
      autocomplete="current-password"
      focused={usedPasswordMode == 'askPassword'}
      saveOnInput
      data-testid="DatabaseLoginModal_password"
    />

    {#if isTesting}
      <div>
        <FontIcon icon="icon loading" /> Testing connection
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

    <svelte:fragment slot="footer">
      {#if isTesting}
        <FormStyledButton value="Stop connecting" on:click={handleCancelTest} data-testid="DatabaseLoginModal_stop" />
      {:else}
        <FormSubmit value="Connect" on:click={handleSubmit} data-testid="DatabaseLoginModal_connect" />
      {/if}
      <FormStyledButton value="Close" on:click={closeCurrentModal} data-testid="DatabaseLoginModal_close" />
    </svelte:fragment>
  </ModalBase>
</FormProviderCore>
