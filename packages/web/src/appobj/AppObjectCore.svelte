<script lang="ts">
  import FontIcon from '../icons/FontIcon.svelte';
  import contextMenu from '../utility/contextMenu';

  export let icon;
  export let title;

  export let isBold = false;
  export let isBusy = false;
  export let statusIcon = undefined;
  export let statusTitle = undefined;
  export let extInfo = undefined;
  export let menu = undefined;
</script>

<div class="main" class:isBold draggable on:click use:contextMenu={menu}>
  <slot name="prefix" />
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
</style>
