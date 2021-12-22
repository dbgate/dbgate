<script lang="ts" context="module">
  export const allowAddToFavorites = props => true;
</script>

<script lang="ts">
  import { onMount } from 'svelte';
  import LoadingInfo from '../elements/LoadingInfo.svelte';
  import Markdown from '../elements/Markdown.svelte';
  import { apiCall } from '../utility/api';

  export let savedFile;

  let isLoading = false;
  let text = null;

  const handleLoad = async () => {
    isLoading = true;
    const resp = await apiCall('files/load', {
      folder: 'markdown',
      file: savedFile,
      format: 'text',
    });
    text = resp;
    isLoading = false;
  };

  onMount(() => {
    handleLoad();
  });
</script>

{#if isLoading}
  <LoadingInfo message="Loading markdown page" />
{:else}
  <div>
    <Markdown source={text || ''} />
  </div>
{/if}

<style>
  div {
    padding: 10px;
    overflow: auto;
    flex: 1;
  }
</style>
