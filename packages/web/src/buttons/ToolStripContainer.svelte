<div class="wrapper">
  <div class="content">
    <slot />
  </div>

  <div class="toolstrip">
    <slot name="toolstrip" />
  </div>
</div>

<style>
  .wrapper {
    flex: 1;
    display: flex;
    flex-direction: column;
  }
  .content {
    border-bottom: 1px solid var(--theme-border);
    display: flex;
    flex: 1;
    position: relative;
  }

  .toolstrip {
    display: flex;
    flex-wrap: wrap;
    background: var(--theme-bg-1);
  }
</style>
