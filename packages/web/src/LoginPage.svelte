<script lang="ts">
  import { onMount } from 'svelte';
  import { internalRedirectTo } from './clientAuth';
  import FormButton from './forms/FormButton.svelte';
  import FormPasswordField from './forms/FormPasswordField.svelte';
  import FormProvider from './forms/FormProvider.svelte';
  import FormSubmit from './forms/FormSubmit.svelte';
  import FormTextField from './forms/FormTextField.svelte';
  import { apiCall, enableApi } from './utility/api';

  export let isAdminPage;

  onMount(() => {
    const removed = document.getElementById('starting_dbgate_zero');
    if (removed) removed.remove();
  });
</script>

<div class="root theme-light theme-type-light">
  <div class="text">DbGate</div>
  <div class="wrap">
    <div class="logo">
      <img class="img" src="logo192.png" />
    </div>
    <div class="box">
      <div class="heading">Log In</div>
      <FormProvider>
        {#if !isAdminPage}
          <FormTextField label="Username" name="login" autocomplete="username" saveOnInput />
        {/if}
        <FormPasswordField label="Password" name="password" autocomplete="current-password" saveOnInput />

        <div class="submit">
          <FormSubmit
            value={isAdminPage ? 'Log In as Administrator' : 'Log In'}
            on:click={async e => {
              enableApi();
              const resp = await apiCall('auth/login', e.detail);
              if (resp.error) {
                internalRedirectTo(`/?page=not-logged&error=${encodeURIComponent(resp.error)}`);
                return;
              }
              const { accessToken } = resp;
              if (accessToken) {
                localStorage.setItem('accessToken', accessToken);
                internalRedirectTo('/');
                return;
              }
              internalRedirectTo(`/?page=not-logged`);
            }}
          />
        </div>
      </FormProvider>
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
