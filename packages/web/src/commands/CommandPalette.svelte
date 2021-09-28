<script context="module">
  registerCommand({
    id: 'commandPalette.show',
    category: 'Command palette',
    name: 'Show',
    toolbarName: 'Menu',
    toolbarOrder: 0,
    keyText: 'F1',
    toolbar: true,
    showDisabled: true,
    icon: 'icon menu',
    onClick: () => visibleCommandPalette.set(true),
    testEnabled: () => !getVisibleCommandPalette(),
  });

  registerCommand({
    id: 'database.search',
    category: 'Database',
    name: 'Search',
    keyText: 'Ctrl+P',
    onClick: () => visibleCommandPalette.set(true),
    testEnabled: () => !getVisibleCommandPalette(),
  });

  function extractDbItems(db) {
    return db?.tables?.map(table => ({ text: table.pureName, onClick: () => handleDatabaseObjectClick(table) }));
  }
</script>

<script>
  import { filterName } from 'dbgate-tools';

  import _ from 'lodash';
  import { onMount } from 'svelte';
  import FontIcon from '../icons/FontIcon.svelte';
  import {
    commands,
    commandsCustomized,
    currentDatabase,
    getVisibleCommandPalette,
    visibleCommandPalette,
  } from '../stores';
  import clickOutside from '../utility/clickOutside';
  import keycodes from '../utility/keycodes';
  import { useDatabaseInfo } from '../utility/metadataLoaders';
  import registerCommand from './registerCommand';

  let domInput;
  let filter = '';
  let selectedPage = 'menu';
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

  $: filteredItems = (selectedPage == 'database'
    ? extractDbItems($databaseInfo)
    : parentCommand
    ? parentCommand.getSubCommands()
    : sortedComands
  ).filter(x => !x.isGroupCommand && filterName(filter, x.text));

  function handleCommand(command) {
    if (command.getSubCommands) {
      $visibleCommandPalette = command;
      domInput.focus();
      filter = '';
      selectedIndex = 0;
    } else {
      $visibleCommandPalette = false;
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
    if (e.keyCode == keycodes.escape) $visibleCommandPalette = false;

    if (e.keyCode == keycodes.pageDown) selectedIndex = Math.min(selectedIndex + 15, filteredItems.length - 1);
    if (e.keyCode == keycodes.pageUp) selectedIndex = Math.max(selectedIndex - 15, 0);
  }

  $: if (domItems[selectedIndex]) domItems[selectedIndex].scrollIntoView({ block: 'nearest', inline: 'nearest' });
</script>

<div class="main" use:clickOutside on:clickOutside={() => ($visibleCommandPalette = false)}>
  <div class="pages">
    <div
      class="page"
      class:selected={selectedPage == 'menu'}
      on:click={() => {
        selectedPage = 'menu';
        domInput.focus();
      }}
    >
      <FontIcon icon="icon menu" /> Commands
    </div>
    <div
      class="page"
      class:selected={selectedPage == 'database'}
      on:click={() => {
        selectedPage = 'database';
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
        placeholder={parentCommand?.text || ''}
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
          <div>{command.text}</div>
          {#if command.keyText}
            <div class="shortcut">{command.keyText}</div>
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
