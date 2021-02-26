<script lang="ts">
  import WidgetContainer from './widgets/WidgetContainer.svelte';
  import WidgetIconPanel from './widgets/WidgetIconPanel.svelte';
  import { currentTheme, selectedWidget, visibleCommandPalette, visibleToolbar } from './stores';
  import TabsPanel from './widgets/TabsPanel.svelte';
  import TabContent from './TabContent.svelte';
  import CommandPalette from './commands/CommandPalette.svelte';
  import Toolbar from './widgets/Toolbar.svelte';
</script>

<div class={`${$currentTheme} root`}>
  <div class="iconbar">
    <WidgetIconPanel />
  </div>
  <div class="statusbar" />
  {#if $selectedWidget}
    <div class="leftpanel">
      <WidgetContainer />
    </div>
  {/if}
  <div class="tabs">
    <TabsPanel />
  </div>
  <div class="content">
    <TabContent />
  </div>
  {#if $visibleCommandPalette}
    <div class="commads">
      <CommandPalette />
    </div>
  {/if}
  {#if $visibleToolbar}
    <div class="toolbar">
      <Toolbar />
    </div>
  {/if}
</div>

<style>
  .root {
    color: var(--theme-font-1);
  }
  .iconbar {
    position: fixed;
    left: 0;
    top: var(--dim-header-top);
    bottom: var(--dim-statusbar-height);
    width: var(--dim-widget-icon-size);
    background: var(--theme-bg-inv-1);
  }
  .statusbar {
    position: fixed;
    background: var(--theme-bg-statusbar-inv);
    height: var(--dim-statusbar-height);
    left: 0;
    right: 0;
    bottom: 0;
  }
  .leftpanel {
    position: fixed;
    top: var(--dim-header-top);
    left: var(--dim-widget-icon-size);
    bottom: var(--dim-statusbar-height);
    width: var(--dim-left-panel-width);
    background-color: var(--theme-bg-1);
    display: flex;
  }
  .tabs {
    display: flex;
    position: fixed;
    top: var(--dim-header-top);
    left: var(--dim-content-left);
    height: var(--dim-tabs-panel-height);
    right: 0;
    background-color: var(--theme-bg-2);
    border-top: 1px solid var(--theme-border);

    overflow-x: auto;
  }
  .tabs::-webkit-scrollbar {
    height: 7px;
  }
  .content {
    position: fixed;
    top: var(--dim-content-top);
    left: var(--dim-content-left);
    bottom: var(--dim-statusbar-height);
    right: 0;
    background-color: var(--theme-bg-1);
  }
  .commads {
    position: fixed;
    top: var(--dim-header-top);
    left: var(--dim-widget-icon-size);
  }
  .toolbar {
    position: fixed;
    top: 0;
    height: var(--dim-toolbar-height);
    left: 0;
    right: 0;
  }
</style>
