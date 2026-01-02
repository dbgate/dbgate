<script lang="ts">
  import { get_current_component } from 'svelte/internal';
  import createActivator, { isComponentActiveStore } from '../utility/createActivator';

  const thisInstance = get_current_component();

  export let showAlways = false;
  export const activator = showAlways ? null : createActivator('ToolStripContainer', true);

  export function activate() {
    activator?.activate();
  }

  export let scrollContent = false;
  export let hideToolStrip = false;
  export let toolstripPosition = 'top'; // 'top' | 'bottom'

  $: isComponentActive = showAlways || ($isComponentActiveStore('ToolStripContainer', thisInstance) && !hideToolStrip);
</script>

<div class="wrapper">
  {#if isComponentActive && toolstripPosition === 'top'}
    <div class="toolstrip">
      <slot name="toolstrip" />
    </div>
  {/if}

  <div class="content" class:scrollContent class:isComponentActive>
    <slot />
  </div>

  {#if isComponentActive && toolstripPosition === 'bottom'}
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
    display: flex;
    flex: 1;
    position: relative;
    max-height: 100%;
  }

  .content.isComponentActive {
    max-height: calc(100% - 32px);
  }

  .toolstrip {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    background: var(--theme-toolstrip-background);
    border-top: var(--theme-toolstrip-border);
    border-bottom: var(--theme-toolstrip-border);
    padding: 2px 6px;
    gap: 2px;
    min-height: 32px;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);
  }

  .scrollContent {
    overflow-y: auto;
  }
</style>
