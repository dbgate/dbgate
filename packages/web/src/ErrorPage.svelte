<script lang="ts">
  import { onMount } from 'svelte';
  import { useConfig } from './utility/metadataLoaders';
  import ErrorInfo from './elements/ErrorInfo.svelte';
  import Link from './elements/Link.svelte';
  import { internalRedirectTo } from './clientAuth';
  import SpecialPageLayout from './widgets/SpecialPageLayout.svelte';

  const config = useConfig();

  const params = new URLSearchParams(location.search);
  const error = params.get('error');

  onMount(() => {
    const removed = document.getElementById('starting_dbgate_zero');
    if (removed) removed.remove();
  });
</script>

<SpecialPageLayout>
  <div class="heading">Configuration error</div>
  {#if $config?.checkedLicense?.status == 'error'}
    <ErrorInfo
      message={`Invalid license. Please contact sales@dbgate.eu for more details. ${$config?.checkedLicense?.error}`}
    />
  {:else if $config?.configurationError}
    <ErrorInfo message={$config?.configurationError} />
  {:else if error}
    <ErrorInfo message={error} />
  {:else}
    <ErrorInfo message="No error found, try to open app again" />
    <div class="m-2">
      <Link onClick={() => internalRedirectTo('/')}>Back to app</Link>
    </div>
  {/if}
</SpecialPageLayout>

<style>
  .heading {
    text-align: center;
    margin: 1em;
    font-size: xx-large;
  }
</style>
