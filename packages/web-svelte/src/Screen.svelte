<script lang="ts">
  import WidgetContainer from './widgets/WidgetContainer.svelte';
  import WidgetIconPanel from './widgets/WidgetIconPanel.svelte';
  import { leftPanelWidth, selectedWidget } from './stores';
</script>

<div class="theme-dark">
  <div class="iconbar">
    <WidgetIconPanel />
  </div>
  <div class="statusbar" />
  {#if $selectedWidget}
    <div class="leftpanel" style="width: {$leftPanelWidth}px">
      <WidgetContainer />
    </div>
  {/if}
</div>

<style>
  :root {
    --widget-icon-size: 50px;
    --statusbar-height: 20px;
  }
  .iconbar {
    position: fixed;
    left: 0;
    top: 0;
    bottom: var(--statusbar-height);
    width: var(--widget-icon-size);
    background: var(--theme-widget_background);
  }
  .statusbar {
    position: fixed;
    background: var(--theme-statusbar_background);
    height: var(--statusbar-height);
    left: 0;
    right: 0;
    bottom: 0;
  }
  .leftpanel {
    position: fixed;
    top: 0;
    left: var(--widget-icon-size);
    bottom: var(--statusbar-height);
    background-color: var(--theme-left_background);
    display: flex;
  }
</style>
