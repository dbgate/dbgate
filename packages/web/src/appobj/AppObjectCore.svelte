<script lang="ts">
  import FontIcon from '../icons/FontIcon.svelte';
  import contextMenu from '../utility/contextMenu';
  import { createEventDispatcher } from 'svelte';
  import CheckboxField from '../forms/CheckboxField.svelte';

  const dispatch = createEventDispatcher();

  export let icon;
  export let title;
  export let data;
  export let module;

  export let isBold = false;
  export let isBusy = false;
  export let statusIcon = undefined;
  export let statusTitle = undefined;
  export let extInfo = undefined;
  export let menu = undefined;
  export let expandIcon = undefined;
  export let checkedObjectsStore = null;

  $: isChecked = checkedObjectsStore && $checkedObjectsStore.find(x => module.extractKey(data) == module.extractKey(x));

  function handleExpand() {
    dispatch('expand');
  }
  function handleClick() {
    if (checkedObjectsStore) {
      if (isChecked) {
        checkedObjectsStore.update(x => x.filter(y => module.extractKey(data) != module.extractKey(y)));
      } else {
        checkedObjectsStore.update(x => [...x, data]);
      }
    } else {
      dispatch('click');
    }
  }

  function setChecked(value) {
    if (!value && isChecked) {
      checkedObjectsStore.update(x => x.filter(y => module.extractKey(data) != module.extractKey(y)));
    }
    if (value && !isChecked) {
      checkedObjectsStore.update(x => [...x, data]);
    }
  }
</script>

<div
  class="main"
  class:isBold
  draggable={true}
  on:click={handleClick}
  use:contextMenu={menu}
  on:dragstart={e => {
    e.dataTransfer.setData('app_object_drag_data', JSON.stringify(data));
  }}
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
  {#if isBusy}
    <FontIcon icon="icon loading" />
  {:else}
    <FontIcon {icon} />
  {/if}
  {title}
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
</style>
