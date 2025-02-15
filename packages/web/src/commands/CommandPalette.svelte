<script context="module">
  registerCommand({
    id: 'commandPalette.show',
    category: 'Command palette',
    name: 'Show',
    toolbarName: 'Command palette',
    toolbarOrder: 0,
    keyText: 'F1',
    toolbar: true,
    showDisabled: true,
    icon: 'icon menu',
    onClick: () => visibleCommandPalette.set('menu'),
    testEnabled: () => getVisibleCommandPalette() != 'menu',
  });

  registerCommand({
    id: 'database.search',
    category: 'Database',
    toolbarName: 'Database search',
    name: 'Search',
    keyText: isElectronAvailable() ? 'CtrlOrCommand+P' : 'F3',
    onClick: () => visibleCommandPalette.set('database'),
    testEnabled: () => getVisibleCommandPalette() != 'database',
  });

  function extractDbItems(db, dbConnectionInfo, connectionList) {
    const objectList = _.flatten(
      ['tables', 'collections', 'views', 'matviews', 'procedures', 'functions'].map(objectTypeField =>
        _.sortBy(
          ((db || {})[objectTypeField] || []).map(obj => ({
            text: obj.pureName,
            onClick: () => handleDatabaseObjectClick({ objectTypeField, ...dbConnectionInfo, ...obj }),
            icon: databaseObjectIcons[objectTypeField],
          })),
          ['text']
        )
      )
    );
    const databaseList = [];
    for (const connection of connectionList || []) {
      const conid = connection._id;
      if (connection.singleDatabase) continue;
      if (getCurrentConfig()?.singleDbConnection) continue;
      const databases = getLocalStorage(`database_list_${conid}`) || [];
      for (const db of databases) {
        databaseList.push({
          text: `${db.name} on ${getConnectionLabel(connection)}`,
          icon: 'img database',
          onClick: () => switchCurrentDatabase({ connection, name: db.name }),
        });
      }
    }
    return [..._.sortBy(databaseList, 'text'), ...objectList];

    // return db?.tables?.map(table => ({
    //   text: table.pureName,
    //   onClick: () => handleDatabaseObjectClick({ ...dbinfo, ...table }),
    // }));
  }
</script>

<script>
  import { filterName, getConnectionLabel } from 'dbgate-tools';

  import _ from 'lodash';
  import { onMount } from 'svelte';
  import fuzzy from 'fuzzy';
  import { databaseObjectIcons, handleDatabaseObjectClick } from '../appobj/DatabaseObjectAppObject.svelte';
  import FontIcon from '../icons/FontIcon.svelte';
  import {
    commandsCustomized,
    currentDatabase,
    getCurrentConfig,
    getVisibleCommandPalette,
    visibleCommandPalette,
  } from '../stores';
  import clickOutside from '../utility/clickOutside';
  import { isElectronAvailable } from '../utility/getElectron';
  import keycodes from '../utility/keycodes';
  import { useConnectionList, useDatabaseInfo } from '../utility/metadataLoaders';
  import { getLocalStorage } from '../utility/storageCache';
  import registerCommand from './registerCommand';
  import { formatKeyText, switchCurrentDatabase } from '../utility/common';

  let domInput;
  let filter = '';
  const domItems = {};

  $: selectedIndex = true ? 0 : filter;
  $: parentCommand = _.isPlainObject($visibleCommandPalette) ? $visibleCommandPalette : null;

  onMount(() => {
    const oldFocus = document.activeElement;
    domInput.focus();
    return () => {
      if (oldFocus) oldFocus.focus();
    };
  });

  $: sortedComands = _.sortBy(
    Object.values($commandsCustomized).filter(x => x.enabled),
    'text'
  );

  $: conid = _.get($currentDatabase, 'connection._id');
  $: database = _.get($currentDatabase, 'name');
  $: databaseInfo = useDatabaseInfo({ conid, database });
  $: connectionList = useConnectionList();

  $: filteredItems = fuzzy
    .filter(
      filter,
      ($visibleCommandPalette == 'database'
        ? extractDbItems($databaseInfo, { conid, database }, $connectionList)
        : parentCommand
        ? parentCommand.getSubCommands()
        : sortedComands
      ).filter(x => !x.isGroupCommand),
      {
        extract: x => x.text,
        pre: '<b>',
        post: '</b>',
      }
    )
    .map(x => ({
      ...x.original,
      text: x.string,
    }));

  function handleCommand(command) {
    if (command.getSubCommands) {
      $visibleCommandPalette = command;
      domInput.focus();
      filter = '';
      selectedIndex = 0;
    } else {
      $visibleCommandPalette = null;
      command.onClick();
    }
  }

  function handleKeyDown(e) {
    if (e.keyCode == keycodes.upArrow && selectedIndex > 0) selectedIndex--;
    if (e.keyCode == keycodes.downArrow && selectedIndex < filteredItems.length - 1) selectedIndex++;
    if (e.keyCode == keycodes.enter) {
      e.preventDefault();
      e.stopPropagation();
      handleCommand(filteredItems[selectedIndex]);
    }
    if (e.keyCode == keycodes.escape) $visibleCommandPalette = null;

    if (e.keyCode == keycodes.pageDown) selectedIndex = Math.min(selectedIndex + 15, filteredItems.length - 1);
    if (e.keyCode == keycodes.pageUp) selectedIndex = Math.max(selectedIndex - 15, 0);
  }

  $: if (domItems[selectedIndex]) domItems[selectedIndex].scrollIntoView({ block: 'nearest', inline: 'nearest' });
</script>

<div
  class="main"
  use:clickOutside
  on:clickOutside={() => {
    $visibleCommandPalette = null;
  }}
  data-testid='CommandPalette_main'
>
  <div class="pages">
    <div
      class="page"
      class:selected={$visibleCommandPalette == 'menu'}
      on:click={() => {
        $visibleCommandPalette = 'menu';
        domInput.focus();
      }}
    >
      <FontIcon icon="icon menu" /> Commands
    </div>
    <div
      class="page"
      class:selected={$visibleCommandPalette == 'database'}
      on:click={() => {
        $visibleCommandPalette = 'database';
        domInput.focus();
      }}
    >
      <FontIcon icon="icon database" /> Database
    </div>
  </div>
  <div class="mainInner">
    <div class="search">
      <input
        type="text"
        bind:this={domInput}
        bind:value={filter}
        on:keydown={handleKeyDown}
        placeholder={parentCommand?.text ||
          ($visibleCommandPalette == 'database' ? 'Search in database' : 'Search in commands')}
      />
    </div>
    <div class="content">
      {#each filteredItems as command, index}
        <div
          class="command"
          class:selected={index == selectedIndex}
          on:click={() => handleCommand(command)}
          bind:this={domItems[index]}
        >
          <div>
            {#if command.icon}
              <span class="mr-1"><FontIcon icon={command.icon} /></span>
            {/if}
            {@html command.text}
          </div>
          {#if command.keyText}
            <div class="shortcut">{formatKeyText(command.keyText)}</div>
          {/if}
        </div>
      {/each}
    </div>
  </div>
</div>

<style>
  .main {
    width: 500px;
    background: var(--theme-bg-2);
  }

  .mainInner {
    padding: 5px;
  }

  .content {
    max-height: 400px;
    overflow-y: scroll;
  }
  .search {
    display: flex;
  }
  input {
    width: 100%;
  }
  .command {
    padding: 5px;
    display: flex;
    justify-content: space-between;
  }
  .command:hover {
    background: var(--theme-bg-3);
  }
  .command.selected {
    background: var(--theme-bg-selected);
  }
  .shortcut {
    background: var(--theme-bg-3);
  }

  .pages {
    display: flex;
  }
  .page {
    padding: 5px;
    border: 1px solid var(--theme-border);
    cursor: pointer;
  }
  .page:hover {
    color: var(--theme-font-hover);
  }
  .page.selected {
    background: var(--theme-bg-1);
  }
</style>
