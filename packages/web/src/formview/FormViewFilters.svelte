<script lang="ts">
  import _ from 'lodash';

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

  $: baseTable = display?.baseTable;
  $: formFilterColumns = display?.config?.formFilterColumns;
  $: filters = display?.config?.filters;

  $: allFilterNames = _.union(_.keys(filters || {}), formFilterColumns || []);
</script>

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

<ManagerInnerContainer width={managerSize}>
  {#each allFilterNames as uniqueName}
    <FormViewFilterColumn
      column={display.formColumns.find(x => x.uniqueName == uniqueName)}
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
