<script lang="ts" context="module">
  export const matchingProps = [];
</script>

<script lang="ts">
  import { onMount } from 'svelte';
  import LoadingInfo from '../elements/LoadingInfo.svelte';
  import Markdown from '../elements/Markdown.svelte';

  import axiosInstance from '../utility/axiosInstance';

  let isLoading = false;
  let text = null;

  const handleLoad = async () => {
    isLoading = true;
    const resp = await axiosInstance().get('config/changelog');
    text = resp.data;
    isLoading = false;
  };

  onMount(() => {
    handleLoad();
  });
</script>

{#if isLoading}
  <LoadingInfo message="Loading changelog" />
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
