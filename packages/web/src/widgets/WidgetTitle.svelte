<script lang="ts">
  import FontIcon from '../icons/FontIcon.svelte';

  export let clickable = false;
  export let onClose = null;
  export let altsidebar = false;
  export let collapsed = false;
</script>

<div on:click class:clickable {...$$restProps} class="wrapper" class:altsidebar>
  <div class="title-content">
    {#if clickable}
      <FontIcon icon={collapsed ? "icon chevron-right" : "icon chevron-down"} />
    {/if}
    <slot />
  </div>
  {#if onClose}
    <div class="close" on:click={onClose}>
      <FontIcon icon="icon close" />
    </div>
  {/if}
</div>

<style>
  .wrapper {
    padding: 5px;
    font-weight: bold;
    font-size: 9pt;
    text-transform: uppercase;
    background-color: var(--theme-sidebar-section-background);
    border: var(--theme-sidebar-section-border);
    border-top: var(--theme-sidebar-section-border-top);
    color: var(--theme-sidebar-section-foreground);
    display: flex;
    align-items: center;
    justify-content: space-between;
  }

  .wrapper.altsidebar {
    background-color: var(--theme-altsidebar-section-background);
    border: var(--theme-altsidebar-section-border);
    border-top: var(--theme-altsidebar-section-border-top);
    color: var(--theme-altsidebar-section-foreground);
  }

  .title-content {
    display: flex;
    align-items: center;
    gap: 5px;
  }

  .close {
    cursor: pointer;
  }
  .close:hover {
    color: var(--theme-generic-font-hover);
  }
  div.clickable {
    cursor: pointer;
  }
</style>
