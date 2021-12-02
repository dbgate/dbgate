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
  import { presetPalettes, presetDarkPalettes } from '@ant-design/colors';

  import FontIcon from '../icons/FontIcon.svelte';

  import { activeTabId, currentDatabase, currentThemeDefinition, visibleCommandPalette } from '../stores';
  import getConnectionLabel from '../utility/getConnectionLabel';
  import { useConnectionList, useDatabaseServerVersion, useDatabaseStatus } from '../utility/metadataLoaders';
  import axiosInstance from '../utility/axiosInstance';
  import { findCommand } from '../commands/runCommand';

  $: databaseName = $currentDatabase && $currentDatabase.name;
  $: connection = $currentDatabase && $currentDatabase.connection;
  $: status = useDatabaseStatus(connection ? { conid: connection._id, database: databaseName } : {});
  $: serverVersion = useDatabaseServerVersion(connection ? { conid: connection._id, database: databaseName } : {});
  const connections = useConnectionList();

  $: contextItems = $statusBarTabInfo[$activeTabId] as any[];
  $: connectionLabel = getConnectionLabel(connection, { allowExplicitDatabase: false });

  $: connectionColor = getConnectionColor($connections, connection, $currentThemeDefinition);

  let timerValue = 1;

  setInterval(() => {
    timerValue++;
  }, 10000);

  function getConnectionColor(connections, connection, themeDef) {
    if (!connection || !connections) return null;
    const current = connections.find(x => x._id == connection._id);
    if (!current?.connectionColor) return null;
    if (!themeDef) return null;
    // const palettes = themeDef?.themeType == 'dark' ? presetDarkPalettes : presetPalettes;
    const palettes = presetDarkPalettes;
    return palettes[current?.connectionColor][3];
  }

  async function handleSyncModel() {
    if (connection && databaseName) {
      await axiosInstance.post('database-connections/sync-model', { conid: connection._id, database: databaseName });
    }
  }
</script>

<div class="main" style={connectionColor ? `background: ${connectionColor}` : null}>
  <div class="container">
    {#if databaseName}
      <div class="item">
        <FontIcon icon="icon database" padRight />
        {databaseName}
      </div>
    {/if}
    {#if connectionLabel}
      <div class="item">
        <FontIcon icon="icon server" padRight />
        {connectionLabel}
      </div>
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
