<script lang="ts">
  import { get_current_component } from 'svelte/internal';
  import createActivator, { isComponentActiveStore } from '../utility/createActivator';

  const thisInstance = get_current_component();

  export const activator = createActivator('ToolStripContainer', false);

  $: isComponentActive = $isComponentActiveStore('ToolStripContainer', thisInstance);
</script>

<div class="wrapper">
  <div class="content">
    <slot />
  </div>

  {#if isComponentActive}
    <div class="toolstrip">
      <slot name="toolstrip" />
    </div>
  {/if}
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
