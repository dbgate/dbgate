<script lang="ts">
  import _ from 'lodash';
  import InlineButton from '../buttons/InlineButton.svelte';
  import DataFilterControl from '../datagrid/DataFilterControl.svelte';

  import ManagerInnerContainer from '../elements/ManagerInnerContainer.svelte';
  import FontIcon from '../icons/FontIcon.svelte';
  import keycodes from '../utility/keycodes';
  import FormViewFilterColumn from './FormViewFilterColumn.svelte';
  import { stringFilterBehaviour } from 'dbgate-tools';
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
  export let isFormView;

  export let hasMultiColumnFilter;

  $: baseTable = display?.baseTable;
  $: formFilterColumns = display?.config?.formFilterColumns;
  $: filters = display?.config?.filters;
  $: multiColumnFilter = display?.config?.multiColumnFilter;

  $: allFilterNames = isFormView ? _.union(_.keys(filters || {}), formFilterColumns || []) : _.keys(filters);
</script>

{#if isFormView}
  <div class="m-1">
    <div>Column name filter</div>
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

{#if hasMultiColumnFilter}
  <div class="m-1">
    <div class="space-between">
      <span>Multi column filter</span>
      {#if multiColumnFilter}
        <InlineButton
          square
          narrow
          on:click={() => {
            display.setMutliColumnFilter(null);
          }}
        >
          <FontIcon icon="icon close" />
        </InlineButton>
      {/if}
    </div>

    <DataFilterControl
      filterBehaviour={stringFilterBehaviour}
      filter={multiColumnFilter}
      setFilter={value => display.setMutliColumnFilter(value)}
      {driver}
      {conid}
      {database}
      {schemaName}
      {pureName}
    />
  </div>
{/if}

<ManagerInnerContainer width={managerSize}>
  {#each allFilterNames as uniqueName}
    <FormViewFilterColumn
      {isDynamicStructure}
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
