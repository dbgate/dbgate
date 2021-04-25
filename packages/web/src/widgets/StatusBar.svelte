<script lang="ts" context="module">
  const statusBarTabInfo = writable({});

  export function updateStatuBarInfo(tabid, info) {
    statusBarTabInfo.update(x => ({
      ...x,
      [tabid]: info,
    }));
  }
</script>

<script lang="ts">
  import { writable } from 'svelte/store';

  import FontIcon from '../icons/FontIcon.svelte';

  import { activeTabId, currentDatabase } from '../stores';
  import { useDatabaseServerVersion, useDatabaseStatus } from '../utility/metadataLoaders';

  $: databaseName = $currentDatabase && $currentDatabase.name;
  $: connection = $currentDatabase && $currentDatabase.connection;
  $: status = useDatabaseStatus(connection ? { conid: connection._id, database: databaseName } : {});
  $: serverVersion = useDatabaseServerVersion(connection ? { conid: connection._id, database: databaseName } : {});

  $: contextItems = $statusBarTabInfo[$activeTabId] as any[];
</script>

<div class="main">
  <div class="container">
    {#if databaseName}
      <div class="item">
        <FontIcon icon="icon database" />
        {databaseName}
      </div>
    {/if}
    {#if connection && (connection.displayName || connection.server)}
      <div class="item">
        <FontIcon icon="icon server" />
        {connection.displayName || connection.server}
      </div>
    {/if}
    {#if connection && connection.user}
      <div class="item">
        <FontIcon icon="icon account" />
        {connection.user}
      </div>
    {/if}
    {#if connection && $status}
      <div class="item">
        {#if $status.name == 'pending'}
          <FontIcon icon="icon loading" /> Loading
        {:else if $status.name == 'ok'}
          <FontIcon icon="img ok-inv" /> Connected
        {:else if $status.name == 'error'}
          <FontIcon icon="img error-inv" /> Error
        {/if}
      </div>
    {/if}
    {#if !connection}
      <div class="item">
        <FontIcon icon="icon disconnected" /> Not connected
      </div>
    {/if}
    {#if $serverVersion}
      <div class="item flex" title={$serverVersion.version}>
        <FontIcon icon="icon version" />
        <div class="version ml-1">
          {$serverVersion.versionText || $serverVersion.version}
        </div>
      </div>
    {/if}
  </div>
  <div class="container">
    {#each contextItems || [] as item}
      <div class="item">
        {#if item.icon}
          <FontIcon icon={item.icon} />
        {/if}
        {item.text}
      </div>
    {/each}
  </div>
</div>

<style>
  .main {
    display: flex;
    color: var(--theme-font-inv-1);
    align-items: stretch;
    justify-content: space-between;
  }
  .container {
    display: flex;
  }
  .item {
    padding: 2px 10px;
  }

  .version {
    max-width: 200px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
</style>
