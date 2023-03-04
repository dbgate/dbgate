<script>
  import TabRegister from './TabRegister.svelte';

  import TabsPanel from './TabsPanel.svelte';
</script>

<div class="tabs">
  <TabsPanel />
</div>
<div class="content">
  <TabRegister />
</div>

<style>
  .tabs {
    position: absolute;
    top: 0;
    left: 0;
    height: var(--dim-tabs-panel-height);
    right: 0;
    background-color: var(--theme-bg-1);
    border-top: 1px solid var(--theme-border);
  }
  .content {
    position: absolute;
    top: var(--dim-tabs-panel-height);
    left: 0;
    bottom: 0;
    right: 0;
    background-color: var(--theme-bg-1);
  }
</style>
