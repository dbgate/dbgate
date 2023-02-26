<script lang="ts">
  import _ from 'lodash';
  import DataFilterControl from '../datagrid/DataFilterControl.svelte';

  import ManagerInnerContainer from '../elements/ManagerInnerContainer.svelte';
  import keycodes from '../utility/keycodes';
  import FormViewFilterColumn from './FormViewFilterColumn.svelte';
  // import PrimaryKeyFilterEditor from './PrimaryKeyFilterEditor.svelte';

  export let managerSize;
  export let display;
  export let setConfig;

  export let driver;
  export let conid;
  export let database;
  export let schemaName;
  export let pureName;

  export let isDynamicStructure;
  export let useEvalFilters;
  export let isFormView;

  $: baseTable = display?.baseTable;
  $: formFilterColumns = display?.config?.formFilterColumns;
  $: filters = display?.config?.filters;

  $: allFilterNames = isFormView ? _.union(_.keys(filters || {}), formFilterColumns || []) : _.keys(filters);
</script>

{#if isFormView}
  <div class="m-1">
    <div>Column filter</div>
    <div class="flex">
      <input
        type="text"
        value={display?.config?.formColumnFilterText || ''}
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
{/if}

<!-- <DataFilterControl
  filterType='string'
  filter={filters[uniqueName]}
  setFilter={value => display.setFilter(uniqueName, value)}
  {driver}
  {conid}
  {database}
  {schemaName}
  {pureName}
  columnName={column.uniquePath.length == 1 ? column.uniquePath[0] : null}
  foreignKey={column.foreignKey}
/> -->

<ManagerInnerContainer width={managerSize}>
  {#each allFilterNames as uniqueName}
    <FormViewFilterColumn
      {isDynamicStructure}
      {useEvalFilters}
      {isFormView}
      {uniqueName}
      {display}
      {filters}
      {driver}
      {conid}
      {database}
      {schemaName}
      {pureName}
    />
  {/each}
</ManagerInnerContainer>
