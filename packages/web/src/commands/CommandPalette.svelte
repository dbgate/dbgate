<script context="module">
  registerCommand({
    id: 'commandPalette.show',
    category: __t('command.commandPalette', { defaultMessage: 'Command palette' }),
    name: __t('command.commandPalette.show', { defaultMessage: 'Show' }),
    toolbarName: __t('command.commandPalette', { defaultMessage: 'Command palette' }),
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
    category: __t('command.database', { defaultMessage: 'Database' }),
    toolbarName: __t('command.database.databaseSearch', { defaultMessage: 'Database search' }),
    name: __t('command.database.search', { defaultMessage: 'Search' }),
    keyText: isElectronAvailable() ? 'CtrlOrCommand+P' : 'F3',
    onClick: () => visibleCommandPalette.set('database'),
    testEnabled: () => getVisibleCommandPalette() != 'database',
  });

  function extractDbItems(db, dbConnectionInfo, connectionList, $extensions, currentThemeType) {
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
      
      const driver = findEngineDriver(connection, $extensions);
      const driverIcon = getDriverIcon(driver, currentThemeType);
      const connectionIcon = driverIcon || 'img database';
      
      for (const db of databases) {
        databaseList.push({
          text: `${db.name} on ${getConnectionLabel(connection)}`,
          icon: connectionIcon,
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
  import { filterName, getConnectionLabel, findEngineDriver } from 'dbgate-tools';

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
    extensions,
  } from '../stores';
  import clickOutside from '../utility/clickOutside';
  import { isElectronAvailable } from '../utility/getElectron';
  import keycodes from '../utility/keycodes';
  import { useConnectionList, useDatabaseInfo } from '../utility/metadataLoaders';
  import { getLocalStorage } from '../utility/storageCache';
  import registerCommand from './registerCommand';
  import { formatKeyText, switchCurrentDatabase } from '../utility/common';
  import { _tval, __t, _t } from '../translations';
  import { getDriverIcon } from '../utility/driverIcons';
  import { currentThemeType } from '../plugins/themes';

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
        ? extractDbItems($databaseInfo, { conid, database }, $connectionList, $extensions, $currentThemeType)
        : parentCommand
          ? parentCommand.getSubCommands()
          : sortedComands
      ).filter(x => !x.isGroupCommand),
      {
        extract: x => _tval(x.text),
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
  data-testid="CommandPalette_main"
>
  <div
    class="overlay"
    on:click={() => {
      $visibleCommandPalette = null;
    }}
  />
  <div class="palette">
    <div class="pages">
      <div
        class="page"
        class:selected={$visibleCommandPalette == 'menu'}
        on:click={() => {
          $visibleCommandPalette = 'menu';
          domInput.focus();
        }}
      >
        <FontIcon icon="icon menu" /> {_t('commandPalette.commands', { defaultMessage: 'Commands' })}
      </div>
      <div
        class="page"
        class:selected={$visibleCommandPalette == 'database'}
        on:click={() => {
          $visibleCommandPalette = 'database';
          domInput.focus();
        }}
      >
        <FontIcon icon="icon database" /> {_t('common.database', { defaultMessage: 'Database' })}
      </div>
    </div>
    <div class="mainInner">
      <div class="search">
        <input
          type="text"
          bind:this={domInput}
          bind:value={filter}
          on:keydown={handleKeyDown}
          placeholder={_tval(parentCommand?.text) ||
            ($visibleCommandPalette == 'database' ? _t('commandPalette.searchInDatabase', { defaultMessage: 'Search in database' }) : _t('commandPalette.searchInCommands', { defaultMessage: 'Search in commands' }))}
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
</div>

<style>
  .main {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    display: flex;
    justify-content: center;
    align-items: flex-start;
    padding-top: 100px;
    z-index: 1000;
  }

  .overlay {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background-color: var(--theme-modal-overlay-background);
    z-index: 1;
  }

  .palette {
    position: relative;
    z-index: 2;
    width: 600px;
    background: var(--theme-modal-background);
    border: var(--theme-modal-border);
    border-radius: 6px;
    box-shadow: var(--theme-modal-shadow);
    overflow: hidden;
  }

  .mainInner {
    padding: 0;
  }

  .content {
    max-height: 500px;
    overflow-y: auto;
  }

  .search {
    display: flex;
    padding: 12px;
    background: var(--theme-modal-background);
    border-bottom: var(--theme-table-border);
  }

  input {
    width: 100%;
    padding: 10px 12px;
    background: var(--theme-input-background);
    border: var(--theme-input-border);
    border-radius: 6px;
    color: var(--theme-input-foreground);
    font-size: 14px;
    font-weight: 500;
  }

  input::placeholder {
    color: var(--theme-input-placeholder);
  }

  input:hover {
    border: var(--theme-input-border-hover);
  }

  input:focus {
    outline: none;
    border: var(--theme-input-border-focus);
    box-shadow: var(--theme-input-focus-ring);
  }

  .command {
    padding: 10px 16px;
    display: flex;
    justify-content: space-between;
    align-items: center;
    cursor: pointer;
    border-radius: 0;
    color: var(--theme-generic-font);
    transition: background-color 150ms ease-in-out;
  }

  .command:hover {
    background: var(--theme-table-hover-background);
  }

  .command.selected {
    background: var(--theme-table-selected-background);
    color: var(--theme-generic-font);
  }

  .shortcut {
    background: var(--theme-input-background);
    border: var(--theme-input-border);
    padding: 4px 8px;
    border-radius: 4px;
    font-size: 11px;
    color: var(--theme-generic-font-grayed);
    font-weight: 500;
    margin-left: 12px;
  }

  .pages {
    display: flex;
    background: var(--theme-modal-background);
    border-bottom: var(--theme-table-border);
  }

  .page {
    padding: 12px 16px;
    cursor: pointer;
    color: var(--theme-generic-font-grayed);
    border-bottom: 2px solid transparent;
    font-weight: 500;
    display: flex;
    align-items: center;
    gap: 6px;
    transition: color 150ms ease-in-out, border-color 150ms ease-in-out;
  }

  .page:hover {
    color: var(--theme-generic-font-hover);
  }

  .page.selected {
    color: var(--theme-generic-font);
    border-bottom-color: var(--theme-link-foreground);
  }
</style>
