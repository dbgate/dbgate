<script lang="ts">
  import { onMount } from 'svelte';
  import FormStyledButton from './buttons/FormStyledButton.svelte';
  import { doLogout, redirectToAdminLogin, redirectToLogin } from './clientAuth';

  onMount(() => {
    const removed = document.getElementById('starting_dbgate_zero');
    if (removed) removed.remove();
  });

  const params = new URLSearchParams(location.search);
  const error = params.get('error');
  const isAdmin = params.get('is-admin') == 'true';

  function handleLogin() {
    if (isAdmin) {
      redirectToAdminLogin();
    } else {
      redirectToLogin(undefined, true);
    }
  }
</script>

<div class="root theme-light theme-type-light">
  <div class="title">Sorry, you are not authorized to run DbGate</div>
  {#if error}
    <div class="error">{error}</div>
  {/if}

  <div class="button">
    <FormStyledButton value="Log In" on:click={handleLogin} />
    <FormStyledButton value="Log Out" on:click={doLogout} />
  </div>
</div>

<style>
  .root {
    color: var(--theme-font-1);
  }

  .title {
    font-size: x-large;
    margin-top: 20vh;
    text-align: center;
  }

  .error {
    margin-top: 1em;
    text-align: center;
  }

  .button {
    display: flex;
    justify-content: center;
    margin-top: 1em;
  }
</style>
