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
  import FontIcon from './icons/FontIcon.svelte';
  import createRef from './utility/createRef';
  import Link from './elements/Link.svelte';
  import SpecialPageLayout from './widgets/SpecialPageLayout.svelte';

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

  function extractRedirectUri() {
    const res = (location.origin + location.pathname).replace(/\/login.html$/, '/');
    console.log('Using redirect URI:', res);
    return res;
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
      redirectUri: extractRedirectUri(),
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

  $: {
    if ($config?.configurationError) {
      console.log('Configuration error', $config);
      internalRedirectTo(`/error.html`);
    }
  }
</script>

<SpecialPageLayout>
  <div class="heading">{isAdminPage ? 'Admin Log In' : 'Log In'}</div>
  <div class="login-link">
    {#if $config?.isAdminLoginForm}
      {#if isAdminPage}
        <Link internalRedirect="/login.html" data-testid="LoginPage_linkRegularUser">Log In as Regular User</Link>
      {:else}
        <Link internalRedirect="/admin-login.html" data-testid="LoginPage_linkAdmin">Log In as Administrator</Link>
      {/if}
    {/if}
  </div>
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
        <FormTextField
          label="Username"
          name="login"
          autocomplete="username"
          saveOnInput
          data-testid="LoginPage_username"
        />
      {/if}
      {#if selectedConnection.passwordMode == 'askUser' || selectedConnection.passwordMode == 'askPassword'}
        <FormPasswordField
          label="Password"
          name="password"
          autocomplete="current-password"
          saveOnInput
          data-testid="LoginPage_password"
        />
      {/if}
    {:else}
      {#if !isAdminPage && workflowType == 'credentials'}
        <FormTextField
          label="Username"
          name="login"
          autocomplete="username"
          saveOnInput
          data-testid="LoginPage_username"
        />
      {/if}
      {#if workflowType == 'credentials'}
        <FormPasswordField
          label="Password"
          name="password"
          autocomplete="current-password"
          saveOnInput
          data-testid="LoginPage_password"
        />
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
          data-testid="LoginPage_submitLogin"
          on:click={async e => {
            const state = `dbg-dblogin:${strmid}:${selectedConnection?.conid}:${$values.amoid}`;
            sessionStorage.setItem('dbloginAuthState', state);
            internalRedirectTo(
              `/connections/dblogin-web?conid=${selectedConnection?.conid}&state=${encodeURIComponent(state)}&redirectUri=${extractRedirectUri()}`
            );
          }}
        />
      {:else if selectedConnection}
        <FormSubmit
          value="Log In"
          data-testid="LoginPage_submitLogin"
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
          data-testid="LoginPage_submitLogin"
        />
      {/if}
    </div>
  </FormProviderCore>

  <svelte:fragment slot="bottom-buttons">
    {#each availableProviders.filter(x => x.workflowType == 'anonymous' || x.workflowType == 'redirect') as provider}
      <div
        class="loginButton"
        on:click={() => processSingleProvider(provider)}
        data-testid={`LoginPage_loginButton_${provider.name}`}
      >
        {provider.name}
      </div>
    {/each}
  </svelte:fragment>
</SpecialPageLayout>

<style>
  .submit {
    margin: var(--dim-large-form-margin);
    display: flex;
  }

  .submit :global(input) {
    flex: 1;
    font-size: larger;
  }

  .wrap {
    margin-top: 20vh;
  }

  .heading {
    text-align: center;
    margin: 1em;
    font-size: xx-large;
  }

  .loginButton {
    padding: 10px;
    width: 140px;
    max-width: 140px;
    min-width: 140px;
    margin: 20px;
    margin-bottom: 0;
    flex: 1;
    text-align: center;
    border-radius: 5px;
    cursor: pointer;

    border: 1px solid var(--theme-bg-button-inv-3);
    background-color: var(--theme-bg-button-inv-2);
    color: var(--theme-font-inv-1);
  }

  .loginButton:hover {
    background-color: var(--theme-bg-button-inv-3);
  }

  .login-link {
    position: absolute;
    top: 10px;
    right: 10px;
  }
</style>
