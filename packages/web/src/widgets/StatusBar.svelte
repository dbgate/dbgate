<script lang="ts">
  import FontIcon from '../icons/FontIcon.svelte';

  import { currentDatabase } from '../stores';
  import { useDatabaseStatus } from '../utility/metadataLoaders';

  $: databaseName = $currentDatabase && $currentDatabase.name;
  $: connection = $currentDatabase && $currentDatabase.connection;
  $: status = useDatabaseStatus(connection ? { conid: connection._id, database: databaseName } : {});
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
</style>
