<script lang="ts">
  import { getContext } from 'svelte';
  import FontIcon from '../icons/FontIcon.svelte';
  import { _t, _tval } from '../translations';
  import InlineButton from '../buttons/InlineButton.svelte';

  export let onExecute;

  const selectedMacro = getContext('selectedMacro') as any;
</script>

<div class="container">
  <div class="header">
    <FontIcon icon="img macro" />
    <div class="ml-2">
      {_tval($selectedMacro?.title)}
    </div>
  </div>
  <div class="buttons">
    <InlineButton on:click={onExecute}>
      <FontIcon icon="icon run" /> {_t('common.execute', { defaultMessage: 'Execute' })}
    </InlineButton>
    <InlineButton on:click={() => ($selectedMacro = null)}>
      <FontIcon icon="icon close" /> {_t('common.close', { defaultMessage: 'Close' })}
    </InlineButton>
  </div>
</div>

<style>
  .container {
    display: flex;
    justify-content: space-between;
    align-items: stretch;
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
    align-items: center;
  }

  .buttons {
    display: flex;
    align-items: stretch;
    margin-right: 10px;
  }
</style>
