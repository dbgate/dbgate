<script lang="ts">
  import { getContext } from 'svelte';
  import FontIcon from '../icons/FontIcon.svelte';
  import ToolbarButton from '../buttons/ToolbarButton.svelte';

  export let onExecute;

  const selectedMacro = getContext('selectedMacro') as any;
</script>

<div class="container">
  <div class="header">
    <FontIcon icon="img macro" />
    <div class="ml-2">
      {$selectedMacro?.title}
    </div>
  </div>
  <div class="buttons">
    <ToolbarButton icon="icon run" on:click={onExecute}>Execute</ToolbarButton>
    <ToolbarButton icon="icon close" on:click={() => ($selectedMacro = null)}>Close</ToolbarButton>
  </div>
</div>

<style>
  .container {
    display: flex;
    justify-content: space-between;
    align-items: stretch;
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
    align-items: center;
  }

  .buttons {
    display: flex;
    align-items: stretch;
  }
</style>
