<script lang="ts">
  import { getContext } from 'svelte';

  import FormStyledButton from '../buttons/FormStyledButton.svelte';

  import WidgetTitle from '../widgets/WidgetTitle.svelte';
  import MacroParameters from './MacroParameters.svelte';
  import { _t } from '../translations';

  const selectedMacro = getContext('selectedMacro') as any;

  export let onExecute;
</script>

<div class="wrapper">
  <div class="section">
    <WidgetTitle>{_t('common.execute', { defaultMessage: 'Execute' })}</WidgetTitle>
    <FormStyledButton value={_t('common.execute', { defaultMessage: 'Execute' })} on:click={onExecute} />
  </div>

  <div class="section">
    <WidgetTitle>{_t('common.parameters', { defaultMessage: 'Parameters' })}</WidgetTitle>
    {#if $selectedMacro?.args && $selectedMacro?.args?.length > 0}
      {#key $selectedMacro?.name}
        <MacroParameters args={$selectedMacro?.args||[]} namePrefix={`${$selectedMacro?.name}#`} />
      {/key}
    {:else}
      <div class="m-1">{_t('datagrid.macros.noParameters', { defaultMessage: 'This macro has no parameters' })}</div>
    {/if}
  </div>

  <div class="section">
    <WidgetTitle>{_t('common.description', { defaultMessage: 'Description' })}</WidgetTitle>
    <div class="m-1">{$selectedMacro?.description}</div>
  </div>
</div>

<style>
  .wrapper {
    display: flex;
    overflow-y: auto;
  }
  .section {
    margin: 5px;
  }
</style>
