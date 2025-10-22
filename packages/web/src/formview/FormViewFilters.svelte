<script lang="ts">
  import _ from 'lodash';
  import InlineButton from '../buttons/InlineButton.svelte';
  import DataFilterControl from '../datagrid/DataFilterControl.svelte';

  import ManagerInnerContainer from '../elements/ManagerInnerContainer.svelte';
  import FontIcon from '../icons/FontIcon.svelte';
  import keycodes from '../utility/keycodes';
  import FormViewFilterColumn from './FormViewFilterColumn.svelte';
  import { stringFilterBehaviour } from 'dbgate-tools';
  import CheckboxField from '../forms/CheckboxField.svelte';
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
        value={display?.config?.searchInColumns || ''}
        on:keydown={e => {
          if (e.keyCode == keycodes.escape) {
            setConfig(x => ({
              ...x,
              searchInColumns: '',
            }));
          }
        }}
        on:input={e =>
          setConfig(x => ({
            ...x,
            // @ts-ignore
            searchInColumns: e.target.value,
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
      <div class="flex items-center gap-2">
        <CheckboxField
          checked={!display.isMultiColumnFilterDisabled()}
          on:change={() => {
            display.toggleMultiColumnFilterEnabled();
          }}
        />
        <InlineButton
          square
          narrow
          on:click={() => {
            display.setMutliColumnFilter(null);
          }}
        >
          <FontIcon icon="icon close" />
        </InlineButton>
      </div>
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
      filterDisabled={display.isMultiColumnFilterDisabled()}
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
