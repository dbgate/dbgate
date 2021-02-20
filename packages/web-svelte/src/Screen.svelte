<script lang="ts">
  import WidgetContainer from './widgets/WidgetContainer.svelte';
  import WidgetIconPanel from './widgets/WidgetIconPanel.svelte';
  import { leftPanelWidth, selectedWidget } from './stores';
</script>

<div class="theme-light">
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
    background-color: var(--theme-bg-2);
    display: flex;
  }
</style>
