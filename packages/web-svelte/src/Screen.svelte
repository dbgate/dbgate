<script lang="ts">
  import WidgetIconPanel from './widgets/WidgetIconPanel.svelte';
</script>

<div class="theme-dark">
  <div class="iconbar">
    <WidgetIconPanel />
  </div>
  <div class="statusbar" />
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
</style>
