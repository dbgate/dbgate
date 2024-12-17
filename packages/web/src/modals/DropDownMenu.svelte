<script context="module">
  function getElementOffset(element, side = null) {
    var de = document.documentElement;
    var box = element.getBoundingClientRect();
    var top = box.top + window.pageYOffset - de.clientTop;
    var left = box.left + window.pageXOffset - de.clientLeft;
    if (side == 'right') return { top: top, left: left + box.width };
    return { top: top, left: left };
  }

  function fixPopupPlacement(element) {
    const { width, height } = element.getBoundingClientRect();
    let offset = getElementOffset(element);

    let newLeft = null;
    let newTop = null;

    if (offset.left + width > window.innerWidth) {
      newLeft = offset.left - width;

      if (newLeft < 0) newLeft = 0;
    }

    if (offset.top + height > window.innerHeight) {
      newTop = offset.top - height;

      if (newTop < 0) newTop = 0;
    }

    if (newLeft != null) element.style.left = `${newLeft}px`;
    if (newTop != null) element.style.top = `${newTop}px`;
  }
</script>

<script>
  import _ from 'lodash';
  import { createEventDispatcher } from 'svelte';
  import { onMount } from 'svelte';
  import { commandsCustomized, visibleCommandPalette } from '../stores';
  import { prepareMenuItems } from '../utility/contextMenu';
  import FontIcon from '../icons/FontIcon.svelte';
  import { formatKeyText } from '../utility/common';

  export let items;
  export let top;
  export let left;
  export let onCloseParent;
  export let targetElement;

  let element;

  let hoverItem;
  let hoverOffset;

  let submenuItem;
  let submenuOffset;

  let switchIndex = 0;

  const dispatch = createEventDispatcher();
  let closeHandlers = [];

  function dispatchClose() {
    dispatch('close');
    for (const handler of closeHandlers) {
      handler();
    }
    closeHandlers = [];
  }

  function registerCloseHandler(handler) {
    closeHandlers.push(handler);
  }

  function handleClick(e, item) {
    if (item.disabled) return;
    if (item.submenu) {
      hoverItem = item;
      hoverOffset = getElementOffset(e.target, 'right');

      submenuItem = item;
      submenuOffset = hoverOffset;
      return;
    }
    if (item.switchStore && item.switchValue) {
      item.switchStore.update(x => ({
        ...x,
        [item.switchValue]: !x[item.switchValue],
      }));
      switchIndex++;
      return;
    }
    dispatchClose();
    if (onCloseParent) onCloseParent();
    if (item.onClick) item.onClick();
  }

  function handleClickAlt(e, item) {
    if (item.disabled) return;
    dispatchClose();
    if (onCloseParent) onCloseParent();
    if (item.onClickAlt) item.onClickAlt();
  }

  onMount(() => {
    fixPopupPlacement(element);
  });

  const changeActiveSubmenu = _.throttle(() => {
    submenuItem = hoverItem;
    submenuOffset = hoverOffset;
  }, 500);

  $: preparedItems = prepareMenuItems(items, { targetElement, registerCloseHandler }, $commandsCustomized);

  const handleClickOutside = event => {
    // if (element && !element.contains(event.target) && !event.defaultPrevented) {
    if (event.target.closest('ul.dropDownMenuMarker')) return;

    dispatchClose();
  };

  onMount(() => {
    document.addEventListener('mousedown', handleClickOutside, true);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside, true);
    };
  });
</script>

<ul class="dropDownMenuMarker" style={`left: ${left}px; top: ${top}px`} bind:this={element}>
  {#each preparedItems as item}
    {#if item.divider}
      <li class="divider" />
    {:else}
      <li
        on:mouseenter={e => {
          hoverOffset = getElementOffset(e.target, 'right');
          hoverItem = item;
          changeActiveSubmenu();
        }}
      >
        <a on:click={e => handleClick(e, item)} class:disabled={item.disabled} class:bold={item.isBold}>
          <span>
            {#if item.switchValue && item.switchStoreGetter}
              {#key switchIndex}
                {#if item.switchStoreGetter()[item.switchValue]}
                  <FontIcon icon="icon check" padRight />
                {:else}
                  <FontIcon icon="icon invisible-box" padRight />
                {/if}
              {/key}
            {/if}
            {item.text || item.label}
          </span>
          {#if item.keyText}
            <span class="keyText">{formatKeyText(item.keyText)}</span>
          {/if}
          {#if item.iconAlt}
            <span class="alt-icon" on:click={e => handleClickAlt(e, item)}>
              <FontIcon icon={item.iconAlt} />
            </span>
          {/if}
          {#if item.submenu}
            <div class="menu-right">
              <FontIcon icon="icon menu-right" />
            </div>
          {/if}
        </a>
      </li>
    {/if}
  {/each}
</ul>
{#if submenuItem?.submenu}
  <svelte:self
    items={submenuItem?.submenu}
    {...submenuOffset}
    onCloseParent={() => {
      if (onCloseParent) onCloseParent();
      dispatchClose();
    }}
  />
{/if}

<style>
  ul {
    position: absolute;
    list-style: none;
    background-color: var(--theme-bg-0);
    border-radius: 4px;
    border: 1px solid var(--theme-border);
    box-shadow: 0 6px 12px rgba(0, 0, 0, 0.175);
    padding: 5px 0;
    margin: 2px 0 0;
    font-size: 14px;
    text-align: left;
    min-width: 160px;
    z-index: 1050;
    cursor: default;
    white-space: nowrap;
    overflow-y: auto;
    max-height: calc(100% - 20px);
    user-select: none;
  }

  .keyText {
    font-style: italic;
    font-weight: bold;
    text-align: right;
    margin-left: 16px;
  }

  a {
    padding: 3px 20px;
    line-height: 1.42;
    white-space: nop-wrap;
    color: var(--theme-font-1);
    display: flex;
    justify-content: space-between;
  }

  a.disabled {
    color: var(--theme-font-3);
  }

  a.bold {
    font-weight: bold;
  }

  a:hover:not(.disabled) {
    background-color: var(--theme-bg-1);
    text-decoration: none;
    color: var(--theme-font-1);
  }

  .divider {
    margin: 9px 0px 9px 0px;
    border-top: 1px solid var(--theme-border);
    border-bottom: 1px solid var(--theme-bg-0);
  }

  .menu-right {
    position: relative;
    left: 15px;
  }

  .alt-icon:hover {
    cursor: pointer;
  }

  .alt-icon:hover {
    color: var(--theme-font-hover);
  }
</style>
