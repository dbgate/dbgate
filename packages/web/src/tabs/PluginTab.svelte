<script lang="ts" context="module">
  export const matchingProps = ['packageName'];
</script>

<script lang="ts">
  import compareVersions from 'compare-versions';
  import FormStyledButton from '../buttons/FormStyledButton.svelte';
  import Markdown from '../elements/Markdown.svelte';
  import { extractPluginAuthor, extractPluginIcon } from '../plugins/manifestExtractors';
  import { apiCall, useApiCall } from '../utility/api';

  import hasPermission from '../utility/hasPermission';

  import { useInstalledPlugins } from '../utility/metadataLoaders';

  export let packageName;

  $: installed = useInstalledPlugins();
  $: info = useApiCall('plugins/info', { packageName }, null);
  $: readme = $info?.readme;
  $: manifest = $info?.manifest;
  $: isPackaged = $info?.isPackaged;

  const handleInstall = async () => {
    apiCall('plugins/install', { packageName });
  };
  const handleUninstall = async () => {
    apiCall('plugins/uninstall', { packageName });
  };
  const handleUpgrade = async () => {
    apiCall('plugins/upgrade', { packageName });
  };

  $: installedFound = $installed?.find(x => x.name == packageName);
  $: onlineFound = manifest;

  $: {
    if (manifest == null) {
      if (installedFound) {
        manifest = installedFound;
        readme = installedFound.readme;
      }
    }
  }
</script>

{#if manifest}
  <div class="white-page">
    <div class="header">
      <img src={extractPluginIcon(manifest)} class="icon" />
      <div class="ml-2">
        <div class="title">{packageName}</div>
        <div class="mt-1">
          <span class="bold">{extractPluginAuthor(manifest)}</span>
          <span> | </span>
          <span>{installedFound ? installedFound.version : manifest.version}</span>
        </div>
        {#if isPackaged}
          <div class="mt-2">Plugin is part of DbGate installation</div>
        {:else}
          <div class="mt-1">
            {#if hasPermission('plugins/install') && !installedFound}
              <FormStyledButton type="button" value="Install" on:click={handleInstall} />
            {/if}
            {#if hasPermission('plugins/install') && installedFound}
              <FormStyledButton type="button" value="Uninstall" on:click={handleUninstall} />
            {/if}
            {#if hasPermission('plugins/install') && installedFound && onlineFound && compareVersions(onlineFound.version, installedFound.version) > 0}
              <FormStyledButton type="button" value="Upgrade" on:click={handleUpgrade} />
            {/if}
          </div>
        {/if}
      </div>
    </div>
    <Markdown source={readme} />
  </div>
{/if}

<style>
  .white-page {
    position: absolute;
    left: 0;
    top: 0;
    right: 0;
    bottom: 0;
    background-color: var(--theme-bg-0);
    overflow: auto;
    padding: 10px;
  }

  .header {
    display: flex;
    border-bottom: 1px solid var(--theme-border);
    margin-bottom: 20px;
    padding-bottom: 20px;
  }

  .title {
    font-size: 20pt;
  }

  .icon {
    width: 80px;
    height: 80px;
  }
</style>
