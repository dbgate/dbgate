<script lang="ts" context="module">
  const statusBarTabInfo = writable({});

  // export function updateStatuBarInfo(tabid, info) {
  //   statusBarTabInfo.update(x => ({
  //     ...x,
  //     [tabid]: info,
  //   }));
  // }

  export function updateStatuBarInfoItem(tabid, key, item) {
    statusBarTabInfo.update(tabs => {
      const items = tabs[tabid] || [];
      let newItems;
      if (item == null) {
        newItems = items.filter(x => x.key != key);
      } else if (items.find(x => x.key == key)) {
        newItems = items.map(x => (x.key == key ? { ...item, key } : x));
      } else {
        newItems = [...items, { ...item, key }];
      }
      return {
        ...tabs,
        [tabid]: newItems,
      };
    });
  }
</script>

<script lang="ts">
  import _ from 'lodash';
  import { writable } from 'svelte/store';
  import moment from 'moment';

  import FontIcon from '../icons/FontIcon.svelte';

  import { activeTabId, currentDatabase, visibleCommandPalette } from '../stores';
  import getConnectionLabel from '../utility/getConnectionLabel';
  import { useDatabaseServerVersion, useDatabaseStatus } from '../utility/metadataLoaders';
  import axiosInstance from '../utility/axiosInstance';
  import { findCommand } from '../commands/runCommand';

  $: databaseName = $currentDatabase && $currentDatabase.name;
  $: connection = $currentDatabase && $currentDatabase.connection;
  $: status = useDatabaseStatus(connection ? { conid: connection._id, database: databaseName } : {});
  $: serverVersion = useDatabaseServerVersion(connection ? { conid: connection._id, database: databaseName } : {});

  $: contextItems = $statusBarTabInfo[$activeTabId] as any[];
  $: connectionLabel = getConnectionLabel(connection, { allowExplicitDatabase: false });

  let timerValue = 1;

  setInterval(() => {
    timerValue++;
  }, 10000);

  async function handleSyncModel() {
    if (connection && databaseName) {
      await axiosInstance.post('database-connections/sync-model', { conid: connection._id, database: databaseName });
    }
  }
</script>

<div class="main">
  <div class="container">
    {#if databaseName}
      <div class="item">
        <FontIcon icon="icon database" />
        {databaseName}
      </div>
    {/if}
    {#if connectionLabel}
      <div class="item">
        <FontIcon icon="icon server" />
        {connectionLabel}
      </div>
    {/if}
    {#if connection && connection.user}
      <div class="item">
        <FontIcon icon="icon account" />
        {connection.user}
      </div>
    {/if}
    {#if connection && $status}
      <div class="item clickable" on:click={() => visibleCommandPalette.set(findCommand('database.changeState'))}>
        {#if $status.name == 'pending'}
          <FontIcon icon="icon loading" /> Loading
        {:else if $status.name == 'checkStructure'}
          <FontIcon icon="icon loading" /> Checking model
        {:else if $status.name == 'loadStructure'}
          <FontIcon icon="icon loading" /> Loading model
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
    {#if $status?.analysedTime}
      <div
        class="item flex clickable"
        title={`Last ${databaseName} model refresh: ${moment($status?.analysedTime).format(
          'HH:mm:ss'
        )}\nClick for refresh DB model`}
        on:click={handleSyncModel}
      >
        <FontIcon icon="icon history" />
        <div class="version ml-1">
          {moment($status?.analysedTime).fromNow() + (timerValue ? '' : '')}
        </div>
      </div>
    {/if}
  </div>
  <div class="container">
    {#each contextItems || [] as item}
      <div class="item" class:clickable={item.clickable} on:click={item.onClick}>
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
    cursor: default;
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

  .clickable {
    cursor: pointer;
  }
  .clickable:hover {
    background-color: var(--theme-bg-statusbar-inv-hover);
  }
</style>
