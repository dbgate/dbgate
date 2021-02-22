<script lang="ts">
  import WidgetContainer from './widgets/WidgetContainer.svelte';
  import WidgetIconPanel from './widgets/WidgetIconPanel.svelte';
  import { selectedWidget } from './stores';
  import TabsPanel from './widgets/TabsPanel.svelte';
import TabContent from './TabContent.svelte';
</script>

<div class="theme-light">
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
</div>

<style>
  .iconbar {
    position: fixed;
    left: 0;
    top: 0;
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
    top: 0;
    left: var(--dim-widget-icon-size);
    bottom: var(--dim-statusbar-height);
    width: var(--dim-left-panel-width);
    background-color: var(--theme-bg-2);
    display: flex;
  }
  .tabs {
    display: flex;
    position: fixed;
    top: 0;
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
    top: var(--dim-tabs-panel-height);
    left: var(--dim-content-left);
    bottom: var(--dim-statusbar-height);
    right: 0;
    background-color: var(--theme-bg-1);
  }
</style>
