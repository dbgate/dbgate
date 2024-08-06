<script lang="ts">
  import { onMount } from 'svelte';
  import { useConfig } from './utility/metadataLoaders';
  import ErrorInfo from './elements/ErrorInfo.svelte';
  import Link from './elements/Link.svelte';
  import { internalRedirectTo } from './clientAuth';

  const config = useConfig();

  const params = new URLSearchParams(location.search);
  const error = params.get('error');

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
      <div class="heading">Configuration error</div>
      {#if $config?.isLicenseValid == false}
        <ErrorInfo
          message={`Invalid license. Please contact sales@dbgate.eu for more details. ${$config?.licenseError}`}
        />
      {:else if error}
        <ErrorInfo message={error} />
      {:else}
        <ErrorInfo message="No error found, try to open app again" />
        <div class="m-2">
          <Link onClick={() => internalRedirectTo('/')}>Back to app</Link>
        </div>
      {/if}
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
