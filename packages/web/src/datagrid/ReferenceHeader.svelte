<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import FontIcon from '../icons/FontIcon.svelte';
  import InlineButton from '../buttons/InlineButton.svelte';

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
  <div class="mr-2">
    <InlineButton on:click={() => dispatch('close')}>
      <FontIcon icon="icon close" /> Close
    </InlineButton>
  </div>
</div>

<style>
  .container {
    display: flex;
    justify-content: space-between;
    align-items: center;
    background: var(--theme-datagrid-detail-header-background);
    height: var(--dim-toolbar-height);
    min-height: var(--dim-toolbar-height);
    overflow: hidden;
    border-top: var(--theme-datagrid-detail-header-border);
    border-bottom: var(--theme-datagrid-detail-header-border);
  }
  .header {
    font-weight: bold;
    margin-left: 10px;
    display: flex;
  }
</style>
