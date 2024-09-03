<script lang="ts">
  import { onMount } from 'svelte';
  import { internalRedirectTo } from './clientAuth';
  import FormPasswordField from './forms/FormPasswordField.svelte';
  import FormSubmit from './forms/FormSubmit.svelte';
  import FormTextField from './forms/FormTextField.svelte';
  import { apiCall, enableApi, strmid } from './utility/api';
  import { useConfig } from './utility/metadataLoaders';
  import ErrorInfo from './elements/ErrorInfo.svelte';
  import FormSelectField from './forms/FormSelectField.svelte';
  import { writable } from 'svelte/store';
  import FormProviderCore from './forms/FormProviderCore.svelte';
  import { openWebLink } from './utility/exportFileTools';
  import FontIcon from './icons/FontIcon.svelte';
  import createRef from './utility/createRef';

  export let isAdminPage;

  const config = useConfig();

  let availableConnections = null;
  let availableProviders = [];
  let isTesting = false;
  const testIdRef = createRef(0);
  let sqlConnectResult;

  let serversLoadedForAmoId = null;

  const values = writable({ amoid: null, databaseServer: null });

  $: selectedConnection = availableConnections?.find(x => x.conid == $values.databaseServer);

  $: selectedProvider = availableProviders?.find(x => x.amoid == $values.amoid);
  $: workflowType = selectedProvider?.workflowType ?? 'credentials';

  async function loadAvailableServers(amoid) {
    if (amoid) {
      availableConnections = await apiCall('storage/get-connections-for-login-page', { amoid });
      if (availableConnections?.length > 0) {
        values.update(x => ({ ...x, databaseServer: availableConnections[0].conid }));
      }
      serversLoadedForAmoId = amoid;
    } else {
      availableConnections = null;
    }
  }

  async function processSingleProvider(provider) {
    if (provider.workflowType == 'redirect') {
      await processRedirectLogin(provider.amoid);
    }
    if (provider.workflowType == 'anonymous') {
      processCredentialsLogin(provider.amoid, {});
    }
  }

  async function loadAvailableAuthProviders() {
    const resp = await apiCall('auth/get-providers');
    availableProviders = resp.providers;
    values.update(x => ({ ...x, amoid: resp.default }));

    if (availableProviders.length == 1) {
      processSingleProvider(availableProviders[0]);
    }
  }

  onMount(() => {
    const removed = document.getElementById('starting_dbgate_zero');
    if (removed) removed.remove();

    if (!isAdminPage) {
      loadAvailableAuthProviders();
    }
  });

  $: if ($values.amoid != serversLoadedForAmoId) {
    loadAvailableServers($values.amoid);
  }

  async function processRedirectLogin(amoid) {
    const state = `dbg-oauth:${strmid}:${amoid}`;

    sessionStorage.setItem('oauthState', state);
    console.log('Redirecting to OAUTH provider');

    const resp = await apiCall('auth/redirect', {
      amoid: amoid,
      state,
      redirectUri: location.origin + location.pathname,
    });

    const { uri } = resp;
    if (uri) {
      location.replace(uri);
    }
  }

  async function processCredentialsLogin(amoid, detail) {
    const resp = await apiCall('auth/login', {
      amoid,
      isAdminPage,
      ...detail,
    });
    if (resp.error) {
      internalRedirectTo(
        `/not-logged.html?error=${encodeURIComponent(resp.error)}&is-admin=${isAdminPage ? 'true' : ''}`
      );
      return;
    }
    const { accessToken } = resp;
    if (accessToken) {
      localStorage.setItem(isAdminPage ? 'adminAccessToken' : 'accessToken', accessToken);
      if (isAdminPage) {
        internalRedirectTo('/admin.html');
      } else {
        internalRedirectTo('/');
      }
      return;
    }
    internalRedirectTo(`/not-logged.html`);
  }
</script>

<div class="root theme-light theme-type-light">
  <div class="text">DbGate</div>
  <div class="wrap">
    <div class="logo">
      <img class="img" src="logo192.png" />
    </div>
    <div class="box">
      <div class="heading">Log In</div>
      <FormProviderCore {values}>
        {#if !isAdminPage && availableProviders?.length >= 2}
          <FormSelectField
            label="Authentization method"
            name="amoid"
            isNative
            options={availableProviders.map(mtd => ({ value: mtd.amoid, label: mtd.name }))}
          />
        {/if}

        {#if !isAdminPage && availableConnections && workflowType == 'database'}
          <FormSelectField
            label="Database server"
            name="databaseServer"
            isNative
            options={availableConnections.map(conn => ({ value: conn.conid, label: conn.label }))}
          />
        {/if}

        {#if selectedConnection}
          {#if selectedConnection.passwordMode == 'askUser'}
            <FormTextField label="Username" name="login" autocomplete="username" saveOnInput />
          {/if}
          {#if selectedConnection.passwordMode == 'askUser' || selectedConnection.passwordMode == 'askPassword'}
            <FormPasswordField label="Password" name="password" autocomplete="current-password" saveOnInput />
          {/if}
        {:else}
          {#if !isAdminPage && workflowType == 'credentials'}
            <FormTextField label="Username" name="login" autocomplete="username" saveOnInput />
          {/if}
          {#if workflowType == 'credentials'}
            <FormPasswordField label="Password" name="password" autocomplete="current-password" saveOnInput />
          {/if}
        {/if}

        {#if isAdminPage && $config && !$config.isAdminLoginForm}
          <ErrorInfo message="Admin login is not configured. Please set ADMIN_PASSWORD environment variable" />
        {/if}

        {#if isTesting}
          <div class="ml-5">
            <FontIcon icon="icon loading" /> Testing connection
          </div>
        {/if}

        {#if !isTesting && sqlConnectResult && sqlConnectResult.msgtype == 'error'}
          <div class="error-result ml-5">
            Connect failed: <FontIcon icon="img error" />
            {sqlConnectResult.error}
          </div>
        {/if}

        <div class="submit">
          {#if selectedConnection?.useRedirectDbLogin}
            <FormSubmit
              value="Open database login page"
              on:click={async e => {
                const state = `dbg-dblogin:${strmid}:${selectedConnection?.conid}:${$values.amoid}`;
                sessionStorage.setItem('dbloginAuthState', state);
                // openWebLink(
                //   `connections/dblogin?conid=${selectedConnection?.conid}&state=${encodeURIComponent(state)}&redirectUri=${
                //     location.origin + location.pathname
                //   }`
                // );
                internalRedirectTo(
                  `/connections/dblogin-web?conid=${selectedConnection?.conid}&state=${encodeURIComponent(state)}&redirectUri=${
                    location.origin + location.pathname
                  }`
                );
              }}
            />
          {:else if selectedConnection}
            <FormSubmit
              value="Log In"
              on:click={async e => {
                if (selectedConnection.passwordMode == 'askUser' || selectedConnection.passwordMode == 'askPassword') {
                  enableApi();
                  isTesting = true;
                  testIdRef.update(x => x + 1);
                  const testid = testIdRef.get();
                  const resp = await apiCall('connections/dblogin-auth', {
                    amoid: $values.amoid,
                    conid: selectedConnection.conid,
                    user: $values['login'],
                    password: $values['password'],
                  });
                  if (testIdRef.get() != testid) return;
                  isTesting = false;
                  if (resp.accessToken) {
                    localStorage.setItem('accessToken', resp.accessToken);
                    internalRedirectTo('/');
                  } else {
                    sqlConnectResult = resp;
                  }
                } else {
                  enableApi();
                  const resp = await apiCall('connections/dblogin-auth', {
                    amoid: $values.amoid,
                    conid: selectedConnection.conid,
                  });
                  localStorage.setItem('accessToken', resp.accessToken);
                  internalRedirectTo('/');
                }
              }}
            />
          {:else}
            <FormSubmit
              value={isAdminPage
                ? 'Log In as Administrator'
                : workflowType == 'redirect'
                  ? 'Redirect to login page'
                  : 'Log In'}
              on:click={async e => {
                enableApi();

                if (isAdminPage || workflowType == 'credentials' || workflowType == 'anonymous') {
                  await processCredentialsLogin($values.amoid, e.detail);
                } else if (workflowType == 'redirect') {
                  await processRedirectLogin($values.amoid);
                }
              }}
            />
          {/if}
        </div>
      </FormProviderCore>
    </div>
  </div>
</div>

<style>
  .logo {
    display: flex;
    margin-bottom: 1rem;
    align-items: center;
    justify-content: center;
  }
  .img {
    width: 80px;
  }
  .text {
    position: fixed;
    top: 1rem;
    left: 1rem;
    font-size: 30pt;
    font-family: monospace;
    color: var(--theme-bg-2);
    text-transform: uppercase;
  }
  .submit {
    margin: var(--dim-large-form-margin);
    display: flex;
  }

  .submit :global(input) {
    flex: 1;
    font-size: larger;
  }

  .root {
    color: var(--theme-font-1);
    display: flex;
    justify-content: center;
    background-color: var(--theme-bg-1);
    align-items: baseline;
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
  }

  .box {
    width: 600px;
    max-width: 80vw;
    /* max-width: 600px;
    width: 40vw; */
    border: 1px solid var(--theme-border);
    border-radius: 4px;
    background-color: var(--theme-bg-0);
  }

  .wrap {
    margin-top: 20vh;
  }

  .heading {
    text-align: center;
    margin: 1em;
    font-size: xx-large;
  }
</style>
