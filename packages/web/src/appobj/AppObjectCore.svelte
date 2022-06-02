<script lang="ts">
  import FontIcon from '../icons/FontIcon.svelte';
  import contextMenu from '../utility/contextMenu';
  import { createEventDispatcher } from 'svelte';
  import CheckboxField from '../forms/CheckboxField.svelte';

  const dispatch = createEventDispatcher();

  export let icon;
  export let title;
  export let data = null;
  export let module = null;

  export let isBold = false;
  export let isBusy = false;
  export let statusIcon = undefined;
  export let statusIconBefore = undefined;
  export let statusTitle = undefined;
  export let extInfo = undefined;
  export let menu = undefined;
  export let expandIcon = undefined;
  export let checkedObjectsStore = null;
  export let disableContextMenu = false;
  export let colorMark = null;
  export let onPin = null;
  export let onUnpin = null;
  export let showPinnedInsteadOfUnpin = false;
  export let indentLevel = 0;

  $: isChecked =
    checkedObjectsStore && $checkedObjectsStore.find(x => module?.extractKey(data) == module?.extractKey(x));

  function handleExpand() {
    dispatch('expand');
  }
  function handleClick() {
    if (checkedObjectsStore) {
      if (isChecked) {
        checkedObjectsStore.update(x => x.filter(y => module?.extractKey(data) != module?.extractKey(y)));
      } else {
        checkedObjectsStore.update(x => [...x, data]);
      }
    } else {
      dispatch('click');
    }
  }

  function handleMouseUp(e) {
    if (e.button == 1) {
      dispatch('middleclick');
      e.preventDefault();
      e.stopPropagation();
    }
  }

  function setChecked(value) {
    if (!value && isChecked) {
      checkedObjectsStore.update(x => x.filter(y => module?.extractKey(data) != module?.extractKey(y)));
    }
    if (value && !isChecked) {
      checkedObjectsStore.update(x => [...x, data]);
    }
  }

  // $: console.log(title, indentLevel);
</script>

<div
  class="main"
  class:isBold
  draggable={true}
  on:click={handleClick}
  on:mouseup={handleMouseUp}
  on:dblclick
  use:contextMenu={disableContextMenu ? null : menu}
  on:dragstart={e => {
    e.dataTransfer.setData('app_object_drag_data', JSON.stringify(data));
  }}
  on:dragstart
  on:dragenter
  on:dragend
  on:drop
>
  {#if checkedObjectsStore}
    <CheckboxField
      checked={!!isChecked}
      on:change={e => {
        // @ts-ignore
        setChecked(e.target.checked);
      }}
    />
  {/if}
  {#if expandIcon}
    <span class="expand-icon" on:click|stopPropagation={handleExpand}>
      <FontIcon icon={expandIcon} />
    </span>
  {/if}
  {#if indentLevel}
    <span style:margin-right={`${indentLevel * 16}px`} />
  {/if}
  {#if isBusy}
    <FontIcon icon="icon loading" />
  {:else}
    <FontIcon {icon} />
  {/if}
  {#if colorMark}
    <FontIcon style={`color:${colorMark}`} icon="icon square" />
  {/if}
  {title}
  {#if statusIconBefore}
    <span class="status">
      <FontIcon icon={statusIconBefore} />
    </span>
  {/if}
  {#if statusIcon}
    <span class="status">
      <FontIcon icon={statusIcon} title={statusTitle} />
    </span>
  {/if}
  {#if extInfo}
    <span class="ext-info">
      {extInfo}
    </span>
  {/if}
  {#if onPin}
    <span
      class="pin"
      on:click={e => {
        e.preventDefault();
        e.stopPropagation();
        onPin();
      }}
    >
      <FontIcon icon="icon pin" />
    </span>
  {/if}
  {#if onUnpin}
    {#if showPinnedInsteadOfUnpin}
      <span class="pin-active">
        <FontIcon icon="icon pin" />
      </span>
    {:else}
      <span
        class="unpin"
        on:click={e => {
          e.preventDefault();
          e.stopPropagation();
          onUnpin();
        }}
      >
        <FontIcon icon="icon close" />
      </span>
    {/if}
  {/if}
</div>
<slot />

<style>
  .main {
    padding: 5px;
    cursor: pointer;
    white-space: nowrap;
    font-weight: normal;
  }
  .main:hover {
    background-color: var(--theme-bg-hover);
  }
  .isBold {
    font-weight: bold;
  }
  .status {
    margin-left: 5px;
  }
  .ext-info {
    font-weight: normal;
    margin-left: 5px;
    color: var(--theme-font-3);
  }
  .expand-icon {
    margin-right: 3px;
  }

  .pin {
    float: right;
    color: var(--theme-font-2);
  }
  .pin:hover {
    color: var(--theme-font-hover);
  }
  .main .pin {
    visibility: hidden;
  }
  .main:hover .pin {
    visibility: visible;
  }

  .unpin {
    float: right;
    color: var(--theme-font-2);
  }
  .unpin:hover {
    color: var(--theme-font-hover);
  }

  .pin-active {
    float: right;
    color: var(--theme-font-2);
  }
</style>
