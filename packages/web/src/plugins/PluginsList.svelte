<script lang="ts">
  import openNewTab from '../utility/openNewTab';

  import { extractPluginAuthor, extractPluginIcon } from './manifestExtractors';

  export let plugins: any[];

  function openPlugin(packageManifest) {
    openNewTab({
      title: packageManifest.name,
      icon: 'icon plugin',
      tabComponent: 'PluginTab',
      props: {
        packageName: packageManifest.name,
      },
    });
  }
</script>

{#each plugins as packageManifest (packageManifest.name)}
  <div class="wrapper" on:click={() => openPlugin(packageManifest)}>
    <img class="icon" src={extractPluginIcon(packageManifest)} />
    <div class="ml-1">
      <div class="flex">
        <div class="bold">{packageManifest.name}</div>
        <div class="ml-1">{packageManifest.version}</div>
      </div>
      <div>
        {packageManifest.description}
      </div>
      <div class="bold">
        {extractPluginAuthor(packageManifest)}
      </div>
    </div>
  </div>
{/each}

<style>
  .wrapper {
    margin: 1px 3px 10px 5px;
    display: flex;
    align-items: center;
  }
  .wrapper:hover {
    background-color: var(--theme-bg-selected);
  }
  .icon {
    width: 50px;
    height: 50px;
  }
</style>
