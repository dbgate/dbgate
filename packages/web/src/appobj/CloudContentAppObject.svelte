<script lang="ts" context="module">
  import { cloudConnectionsStore } from '../stores';
  import { apiCall } from '../utility/api';
  import AppObjectCore from './AppObjectCore.svelte';

  export const extractKey = data => data.cntid;
  export const createMatcher =
    filter =>
    ({ name }) =>
      filterName(filter, name);
</script>

<script lang="ts">
  import { filterName } from 'dbgate-tools';
  import ConnectionAppObject, { openConnection } from './ConnectionAppObject.svelte';

  export let data;
  export let passProps;

  function createMenu() {
    return [];
  }

  async function handleOpenContent() {
    switch (data.type) {
      case 'connection':
        const conn = await apiCall('connections/get', { conid: data.conid });
        $cloudConnectionsStore = {
          ...$cloudConnectionsStore,
          [data.conid]: conn,
        };
        openConnection(conn);
        break;
    }
  }
</script>

{#if data.conid && $cloudConnectionsStore[data.conid]}
  <ConnectionAppObject
    {...$$restProps}
    {passProps}
    data={{
      ...$cloudConnectionsStore[data.conid],
      status: data.status,
    }}
  />
{:else}
  <AppObjectCore
    {...$$restProps}
    {data}
    icon={'img connection'}
    title={data.name}
    menu={createMenu}
    on:click={handleOpenContent}
  ></AppObjectCore>
{/if}

<style>
  .info {
    margin-left: 30px;
    margin-right: 5px;
    color: var(--theme-font-3);
    white-space: nowrap;
  }
</style>
