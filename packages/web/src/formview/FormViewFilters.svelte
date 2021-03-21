<script lang="ts">
  import _ from 'lodash';

  import ManagerInnerContainer from '../elements/ManagerInnerContainer.svelte';
  import FormViewFilterColumn from './FormViewFilterColumn.svelte';
  import PrimaryKeyFilterEditor from './PrimaryKeyFilterEditor.svelte';

  export let managerSize;
  export let formDisplay;

  $: baseTable = formDisplay?.baseTable;
  $: formFilterColumns = formDisplay?.config?.formFilterColumns;
  $: filters = formDisplay?.config?.filters;

  $: allFilterNames = _.union(_.keys(filters || {}), formFilterColumns || []);
</script>

{#if baseTable?.primaryKey}
  <ManagerInnerContainer width={managerSize}>
    {#each baseTable.primaryKey.columns as col}
      <PrimaryKeyFilterEditor {baseTable} column={col} {formDisplay} />
    {/each}

    {#each allFilterNames as uniqueName}
      <FormViewFilterColumn
        column={formDisplay.columns.find(x => x.uniqueName == uniqueName)}
        {formDisplay}
        {filters}
      />
    {/each}
  </ManagerInnerContainer>
{/if}
