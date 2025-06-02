<script lang="ts">
  import { createGridCache, createGridConfig, FreeTableGridDisplay } from 'dbgate-datalib';
  import { writable } from 'svelte/store';

  import DataGridCore from './DataGridCore.svelte';
  import RowsArrayGrider from './RowsArrayGrider';
  import ErrorInfo from '../elements/ErrorInfo.svelte';
  import LoadingInfo from '../elements/LoadingInfo.svelte';

  export let model;

  let errorMessage = null;

  const config = writable(createGridConfig());
  const cache = writable(createGridCache());

  $: grider = new RowsArrayGrider(model.rows);
  $: display = new FreeTableGridDisplay(model, $config, config.update, $cache, cache.update);
</script>

{#if !model}
  <LoadingInfo wrapper message="Loading data" />
{:else if errorMessage}
  <ErrorInfo message={errorMessage} />
{:else if grider}
  <DataGridCore {...$$props} {grider} {display} />
{/if}
