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
    enabledStore: derived(visibleCommandPalette, $visibleCommandPalette => !$visibleCommandPalette),
  });
</script>

<script>
  import { filterName } from 'dbgate-datalib';

  import _ from 'lodash';
  import { derived } from 'svelte/store';
  import { onMount } from 'svelte';
  import { commands, visibleCommandPalette } from '../stores';
  import clickOutside from '../utility/clickOutside';
  import keycodes from '../utility/keycodes';
  import registerCommand from './registerCommand';

  let domInput;
  let parentCommand;
  let filter = '';

  $: selectedIndex = true ? 0 : filter;

  onMount(() => domInput.focus());

  $: sortedComands = _.sortBy(
    Object.values($commands).filter(x => x.enabled),
    'text'
  );

  $: filteredItems = (parentCommand ? parentCommand.getSubCommands() : sortedComands).filter(x =>
    filterName(filter, x.text)
  );

  function handleCommand(command) {
    if (command.getSubCommands) {
      parentCommand = command;
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
    if (e.keyCode == keycodes.enter) handleCommand(filteredItems[selectedIndex]);
    if (e.keyCode == keycodes.escape) $visibleCommandPalette = false;
  }
</script>

<div class="main" use:clickOutside on:clickOutside={() => ($visibleCommandPalette = false)}>
  <div class="search">
    <input type="text" bind:this={domInput} bind:value={filter} on:keydown={handleKeyDown} />
  </div>
  {#each filteredItems as command, index}
    <div class="command" class:selected={index == selectedIndex} on:click={() => handleCommand(command)}>
      <div>{command.text}</div>
      {#if command.keyText}
        <div class="shortcut">{command.keyText}</div>
      {/if}
    </div>
  {/each}
</div>

<style>
  .main {
    width: 500px;
    max-height: 500px;
    background: var(--theme-bg-2);
    padding: 5px;
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
</style>
