<script lang="ts">
  import { createGridCache, createGridConfig, FreeTableGridDisplay } from 'dbgate-datalib';
  import { writable } from 'svelte/store';

  import DataGridCore from '../datagrid/DataGridCore.svelte';
  import RowsArrayGrider from '../datagrid/RowsArrayGrider';
  import ErrorInfo from '../elements/ErrorInfo.svelte';
  import LoadingInfo from '../elements/LoadingInfo.svelte';
  import { apiCall } from '../utility/api';

  export let reader;

  let isLoading = false;
  let model = null;
  let grider = null;
  let errorMessage = null;

  const config = writable(createGridConfig());
  const cache = writable(createGridCache());

  const handleLoadInitialData = async sourceReader => {
    try {
      if (!sourceReader) {
        model = null;
        grider = null;
        return;
      }
      errorMessage = null;
      isLoading = true;
      const resp = await apiCall('runners/load-reader', sourceReader);
      if (resp.errorMessage) {
        isLoading = false;
        errorMessage = resp.errorMessage;
        return;
      }
      // @ts-ignore
      model = resp;
      grider = new RowsArrayGrider(resp.rows);
      isLoading = false;
    } catch (err) {
      isLoading = false;
      // errorMessage = (err && err.response && err.response.data && err.response.data.error) || 'Loading failed';
      // TODO API
      errorMessage = 'Loading failed';
      console.error(err.response);
    }
  };

  $: handleLoadInitialData(reader);

  $: display = new FreeTableGridDisplay(model, $config, config.update, $cache, cache.update);
</script>

{#if isLoading}
  <LoadingInfo wrapper message="Loading data" />
{:else if errorMessage}
  <ErrorInfo message={errorMessage} />
{:else if grider}
  <DataGridCore {...$$props} {grider} {display} />
{/if}
