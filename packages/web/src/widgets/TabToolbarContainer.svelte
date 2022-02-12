<div class="toolbar">
  <slot name="toolbar" />
</div>

<div class="content">
  <slot />
</div>

<style>
  .content {
    position: absolute;
    left: 0;
    top: var(--dim-toolbar-height);
    right: 0;
    bottom: 0;
    display: flex;
  }

  .toolbar {
    position: absolute;
    left: 0;
    height: var(--dim-toolbar-height);
    right: 0;
    display: flex;
    background: var(--theme-bg-0);
  }
</style>
