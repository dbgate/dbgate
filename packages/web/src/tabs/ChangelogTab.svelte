<script lang="ts" context="module">
  export const matchingProps = [];
</script>

<script lang="ts">
  import { onMount } from 'svelte';
  import LoadingInfo from '../elements/LoadingInfo.svelte';
  import Markdown from '../elements/Markdown.svelte';
  import { apiCall } from '../utility/api';
  import _ from 'lodash';

  let isLoading = false;
  let text = '';

  const handleLoad = async () => {
    isLoading = true;
    const resp = await apiCall('config/changelog');
    text = resp;
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
    <Markdown source={_.isString(text) ? text: ''} />
  </div>
{/if}

<style>
  div {
    padding: 10px;
    overflow: auto;
    flex: 1;
  }
</style>
