<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import FontIcon from '../icons/FontIcon.svelte';
  import ToolbarButton from '../buttons/ToolbarButton.svelte';

  const dispatch = createEventDispatcher();

  export let reference;
</script>

<div class="container">
  <div class="header">
    <FontIcon icon="img reference" />
    <div class="ml-2">
      {reference.pureName} [{reference.columns.map(x => x.refName).join(', ')}] = master [
      {reference.columns.map(x => x.baseName).join(', ')}]
    </div>
  </div>
  <ToolbarButton icon="icon close" on:click={() => dispatch('close')}>Close</ToolbarButton>
</div>

<style>
  .container {
    display: flex;
    justify-content: space-between;
    align-items: center;
    background: var(--theme-bg-modalheader);
    height: var(--dim-toolbar-height);
    min-height: var(--dim-toolbar-height);
    overflow: hidden;
    border-top: 1px solid var(--theme-border);
    border-bottom: 1px solid var(--theme-border);
  }
  .header {
    font-weight: bold;
    margin-left: 10px;
    display: flex;
  }
</style>
