<script lang="ts">
  import _ from 'lodash';
  import { switchCurrentDatabase } from '../utility/common';
  import { getConnectionLabel } from 'dbgate-tools';
  import { focusedConnectionOrDatabase, openedConnections } from '../stores';
  import FormStyledButton from '../buttons/FormStyledButton.svelte';
  import { openConnection } from '../appobj/ConnectionAppObject.svelte';
  import { useServerStatus } from '../utility/metadataLoaders';
  import ErrorInfo from '../elements/ErrorInfo.svelte';

  export let conid;
  export let database;
  export let connection;

  $: serverStatus = useServerStatus();
  $: focusedServerStatus = $focusedConnectionOrDatabase?.conid
    ? $serverStatus?.[$focusedConnectionOrDatabase?.conid]
    : null;
</script>

<div class="no-focused-info">
  {#if $focusedConnectionOrDatabase?.database}
    {#if database}
      <div class="m-1">Current database:</div>
      <div class="m-1 ml-3 mb-3">
        <b>{database}</b>
      </div>
    {/if}
    <FormStyledButton
      value={`Switch to ${$focusedConnectionOrDatabase?.database}`}
      skipWidth
      on:click={() =>
        switchCurrentDatabase({
          connection: $focusedConnectionOrDatabase?.connection,
          name: $focusedConnectionOrDatabase?.database,
        })}
    />
    {#if database}
      <FormStyledButton
        value={`Show ${database}`}
        skipWidth
        outline
        on:click={() => {
          $focusedConnectionOrDatabase = {
            conid,
            database,
            connection,
          };
        }}
      />
    {/if}
  {:else}
    {#if focusedServerStatus?.name == 'error' && focusedServerStatus?.message}
      <div class="m-1">Error connecting <b>{getConnectionLabel($focusedConnectionOrDatabase?.connection)}</b>:</div>
      <ErrorInfo message={focusedServerStatus?.message} />
      <div class="m-3" />
    {/if}
    {#if connection}
      <div class="m-1">Current connection:</div>
      <div class="m-1 ml-3 mb-3">
        <b>{getConnectionLabel(connection)}</b>
      </div>
    {/if}
    {#if !$openedConnections.includes($focusedConnectionOrDatabase?.conid) && $focusedConnectionOrDatabase?.conid}
      <FormStyledButton
        value={`Connect to ${getConnectionLabel($focusedConnectionOrDatabase?.connection)}`}
        skipWidth
        on:click={() => openConnection($focusedConnectionOrDatabase?.connection)}
      />
    {/if}
    {#if connection}
      <FormStyledButton
        value={`Show ${getConnectionLabel(connection)}`}
        skipWidth
        outline
        on:click={() => {
          $focusedConnectionOrDatabase = {
            conid,
            connection,
          };
        }}
      />
    {/if}
  {/if}
</div>

<style>
  .no-focused-info {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: stretch;
    margin-top: 10px;
  }
</style>
