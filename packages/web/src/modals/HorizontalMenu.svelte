<script lang="ts">
  import { commandsCustomized, currentDropDownMenu } from '../stores';
  import { prepareMenuItems } from '../utility/contextMenu';
  import DropDownMenu from './DropDownMenu.svelte';

  export let items;

  let isOpened;
  let openedLabel;

  function handleOpenMenu(element, item) {
    const rect = element.getBoundingClientRect();
    const left = rect.left;
    const top = rect.bottom;
    const items = item.submenu;
    $currentDropDownMenu = { left, top, items };
    isOpened = true;
    openedLabel = item.text || item.label;
  }

  $: preparedItems = prepareMenuItems(items, {}, $commandsCustomized);
  $: if (!$currentDropDownMenu) {
    isOpened = false;
    openedLabel = null;
  }
</script>

<div class="container">
  {#each preparedItems as item}
    <div
      class="item"
      class:opened={openedLabel == (item.text || item.label)}
      on:click={e => handleOpenMenu(e.target, item)}
      on:mousemove={e => {
        if (isOpened) {
          handleOpenMenu(e.target, item);
        }
      }}
    >
      {item.text || item.label}
    </div>
  {/each}
</div>

<!-- {#if currentMenu}
  <DropDownMenu
    left={currentMenu.left}
    top={currentMenu.top}
    items={currentMenu.items}
    on:close={() => {
      currentMenu = null;
    }}
  />
{/if} -->
<style>
  .container {
    display: flex;
  }
  .item {
    height: var(--dim-titlebar-height);
    padding: 0px 10px;
    display: flex;
    align-items: center;
  }

  .item:hover {
    background: var(--theme-bg-3);
  }

  .item.opened {
    background: var(--theme-bg-3);
  }
</style>
