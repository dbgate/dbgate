<script lang="ts">
  import _ from 'lodash';

  import ManagerInnerContainer from '../elements/ManagerInnerContainer.svelte';
import keycodes from '../utility/keycodes';
  import FormViewFilterColumn from './FormViewFilterColumn.svelte';
  import PrimaryKeyFilterEditor from './PrimaryKeyFilterEditor.svelte';

  export let managerSize;
  export let formDisplay;
  export let setConfig;

  $: baseTable = formDisplay?.baseTable;
  $: formFilterColumns = formDisplay?.config?.formFilterColumns;
  $: filters = formDisplay?.config?.filters;

  $: allFilterNames = _.union(_.keys(filters || {}), formFilterColumns || []);

</script>

<div class="m-1">
  <div>Column filter</div>
  <div class="flex">
    <input
      type="text"
      value={formDisplay?.config?.formColumnFilterText || ''}
      on:keydown={e => {
        if (e.keyCode == keycodes.escape) {
          setConfig(x => ({
            ...x,
            formColumnFilterText: '',
          }));
        }
      }}
      on:input={e =>
        setConfig(x => ({
          ...x,
          // @ts-ignore
          formColumnFilterText: e.target.value,
        }))}
    />
  </div>
</div>

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
