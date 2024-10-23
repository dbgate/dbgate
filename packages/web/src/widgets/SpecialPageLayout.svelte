<script lang="ts">
  import { onMount } from 'svelte';
  import { getConfig } from '../utility/metadataLoaders';
  import { handleAuthOnStartup } from '../clientAuth';
  import { setConfigForPermissions } from '../utility/hasPermission';

  async function loadApi() {
    try {
      const config = await getConfig();
      setConfigForPermissions(config);
      await handleAuthOnStartup(config);
    } catch (err) {
      console.log('Error calling API, trying again in 1s:', err.message);
      setTimeout(loadApi, 1000);
    }
  }

  onMount(() => {
    const removed = document.getElementById('starting_dbgate_zero');
    if (removed) removed.remove();

    loadApi();
  });
</script>

<div class="root theme-light theme-type-light">
  <div class="text">DbGate</div>
  <div class="wrap">
    <div class="logo">
      <img class="img" src="logo192.png" />
    </div>
    <div class="box">
      <slot />
    </div>

    <div class="bottomButtonsWrapperWrapper">
      <slot name="bottom-buttons" />
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
    position: relative;
  }

  .wrap {
    margin-top: 20vh;
  }

  .heading {
    text-align: center;
    margin: 1em;
    font-size: xx-large;
  }

  .bottomButtonsWrapperWrapper {
    display: flex;
    flex-wrap: wrap;
    width: 600px;
  }
</style>
