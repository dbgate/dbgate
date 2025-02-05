<script lang="ts">
  import { onMount } from 'svelte';
  import FormStyledButton from './buttons/FormStyledButton.svelte';
  import { doLogout, redirectToAdminLogin, redirectToLogin } from './clientAuth';
  import SpecialPageLayout from './widgets/SpecialPageLayout.svelte';

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

<SpecialPageLayout>
  <div class="my-6">
    <div class="title">Sorry, you are not authorized to run DbGate</div>
    {#if error}
      <div class="error">{error}</div>
    {/if}

    <div class="button">
      <FormStyledButton value="Log In" on:click={handleLogin} data-testid="NotLoggedPage_loginButton" />
      <FormStyledButton value="Log Out" on:click={doLogout} data-testid="NotLoggedPage_logoutButton" />
    </div>
  </div>
</SpecialPageLayout>

<style>
  .title {
    font-size: x-large;
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
