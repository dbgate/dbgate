<script lang="ts">
  import _ from 'lodash';
  import moment from 'moment';
  import { showModal } from '../modals/modalTools';
  import ChooseConnectionColorModal from '../modals/ChooseConnectionColorModal.svelte';

  import FontIcon from '../icons/FontIcon.svelte';

  import {
    activeTabId,
    appUpdateStatus,
    currentArchive,
    currentDatabase,
    currentThemeDefinition,
    selectedWidget,
    visibleCommandPalette,
  } from '../stores';
  import { getConnectionLabel } from 'dbgate-tools';
  import { useConnectionList, useDatabaseServerVersion, useDatabaseStatus } from '../utility/metadataLoaders';
  import { findCommand } from '../commands/runCommand';
  import { useConnectionColor } from '../utility/useConnectionColor';
  import { apiCall } from '../utility/api';
  import { statusBarTabInfo } from '../utility/statusBarStore';

  $: databaseName = $currentDatabase && $currentDatabase.name;
  $: connection = $currentDatabase && $currentDatabase.connection;
  $: dbid = connection ? { conid: connection._id, database: databaseName } : null;
  $: status = useDatabaseStatus(dbid || {});
  $: serverVersion = useDatabaseServerVersion(dbid || {});

  $: contextItems = $statusBarTabInfo[$activeTabId] as any[];
  $: connectionLabel = getConnectionLabel(connection, { allowExplicitDatabase: false });

  $: connectionBackground = useConnectionColor(dbid, 3, 'dark', true);
  $: connectionButtonBackground = useConnectionColor(dbid ? { conid: dbid.conid } : null, 6, 'dark', true);
  $: databaseButtonBackground = useConnectionColor(dbid, 6, 'dark', true, false);

  let timerValue = 1;

  setInterval(() => {
    timerValue++;
  }, 10000);

  async function handleSyncModel() {
    if (connection && databaseName) {
      await apiCall('database-connections/sync-model', { conid: connection._id, database: databaseName });
    }
  }
</script>

<div class="main" style={$connectionBackground}>
  <div class="container">
    {#if databaseName}
      <div class="item">
        {#if connection?.isReadOnly}
          <FontIcon icon="icon lock" padRight />
        {:else}
          <FontIcon icon="icon database" padRight />
        {/if}
        {databaseName}
      </div>
      {#if dbid}
        <div
          class="item clickable"
          title="Database color. Overrides connection color"
          on:click={() => {
            showModal(ChooseConnectionColorModal, {
              ...dbid,
              header: 'Choose database color',
              text: 'This color override connection color for specific database.',
            });
          }}
        >
          <div style={$databaseButtonBackground} class="colorbox">
            <FontIcon icon="icon palette" />
          </div>
        </div>
      {/if}
    {/if}
    {#if connectionLabel}
      <div class="item">
        <FontIcon icon="icon server" padRight />
        {connectionLabel}
      </div>
      {#if dbid}
        <div
          class="item clickable"
          title="Connection color. Can be overriden by database color"
          on:click={() => {
            showModal(ChooseConnectionColorModal, {
              conid: dbid.conid,
              header: 'Choose connection color',
              text: 'This color serves as default color for all databases in this connection.',
            });
          }}
        >
          <div style={$connectionButtonBackground} class="colorbox">
            <FontIcon icon="icon palette" />
          </div>
        </div>
      {/if}
    {/if}
    {#if connection && connection.user}
      <div class="item">
        <FontIcon icon="icon account" padRight />
        {connection.user}
      </div>
    {/if}
    {#if connection && $status}
      <div class="item clickable" on:click={() => visibleCommandPalette.set(findCommand('database.changeState'))}>
        {#if $status.name == 'pending'}
          <FontIcon icon="icon loading" padRight /> Loading
        {:else if $status.name == 'checkStructure'}
          <FontIcon icon="icon loading" padRight /> Checking model
        {:else if $status.name == 'loadStructure'}
          <FontIcon icon="icon loading" padRight /> Loading model
        {:else if $status.name == 'ok'}
          <FontIcon icon="img ok-inv" padRight /> Connected
        {:else if $status.name == 'error'}
          <FontIcon icon="img error-inv" padRight /> Error
        {/if}
      </div>
    {/if}
    {#if !connection}
      <div class="item">
        <FontIcon icon="icon disconnected" padRight /> Not connected
      </div>
    {/if}
    {#if $serverVersion}
      <div class="item flex" title={$serverVersion.version}>
        <FontIcon icon="icon version" padRight />
        <div class="version">
          {$serverVersion.versionText || $serverVersion.version}
        </div>
      </div>
    {/if}
    {#if $status?.analysedTime}
      <div
        class="item flex clickable"
        title={`Last ${databaseName} model refresh: ${moment($status?.analysedTime).format(
          'HH:mm:ss'
        )}\nClick for refresh DB model`}
        on:click={handleSyncModel}
      >
        <FontIcon icon="icon history" padRight />
        <div class="version ml-1">
          {moment($status?.analysedTime).fromNow() + (timerValue ? '' : '')}
        </div>
      </div>
    {/if}
    {#if $currentArchive}
      <div
        class="item flex clickable"
        title="Current archive"
        on:click={() => {
          $selectedWidget = 'archive';
        }}
      >
        <FontIcon icon="icon archive" padRight />
        {$currentArchive}
      </div>
    {/if}
  </div>
  <div class="container">
    {#each contextItems || [] as item}
      <div class="item" class:clickable={item.clickable} on:click={item.onClick}>
        {#if item.icon}
          <FontIcon icon={item.icon} padRight />
        {/if}
        {item.text}
      </div>
    {/each}

    {#if $appUpdateStatus}
      <div class="item">
        <FontIcon icon={$appUpdateStatus.icon} padRight />
        {$appUpdateStatus.message}
      </div>
    {/if}
  </div>
</div>

<style>
  .main {
    display: flex;
    color: var(--theme-font-inv-15);
    align-items: stretch;
    justify-content: space-between;
    cursor: default;
    flex: 1;
  }
  .container {
    display: flex;
    align-items: stretch;
  }
  .item {
    padding: 0px 10px;
    display: flex;
    align-items: center;
    white-space: nowrap;
  }

  .version {
    max-width: 200px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .clickable {
    cursor: pointer;
  }
  .clickable:hover {
    background-color: var(--theme-bg-statusbar-inv-hover);
  }

  .colorbox {
    padding: 0px 3px;
    border-radius: 2px;
    color: var(--theme-bg-statusbar-inv-font);
    background: var(--theme-bg-statusbar-inv-bg);
  }
</style>
