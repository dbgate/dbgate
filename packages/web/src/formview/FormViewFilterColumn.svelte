<script lang="ts">
  import { detectSqlFilterBehaviour, standardFilterBehaviours, mongoFilterBehaviour } from 'dbgate-tools';

  import DataFilterControl from '../datagrid/DataFilterControl.svelte';

  import ColumnLabel from '../elements/ColumnLabel.svelte';
  import InlineButton from '../buttons/InlineButton.svelte';
  import FontIcon from '../icons/FontIcon.svelte';

  export let uniqueName;
  export let display;
  export let filters;

  export let driver;
  export let conid;
  export let database;
  export let schemaName;
  export let pureName;

  export let isDynamicStructure;
  export let isFormView;

  $: column = isFormView ? display.formColumns?.find(x => x.uniqueName == uniqueName) : display?.findColumn(uniqueName);

  function computeFilterBehavoir(column, display, isDynamicStructure) {
    if (display?.filterBehaviourOverride) {
      return display?.filterBehaviourOverride;
    }
    const fromDriver = display?.driver?.getFilterBehaviour(column?.dataType, standardFilterBehaviours);
    if (fromDriver) return fromDriver;
    if (isDynamicStructure) return mongoFilterBehaviour;

    return detectSqlFilterBehaviour(column.dataType);
  }
</script>

{#if column || isDynamicStructure}
  <div class="m-1">
    <div class="space-between">
      {#if column}
        <ColumnLabel {...column} />
      {:else}
        {uniqueName}
      {/if}
      <InlineButton
        square
        narrow
        on:click={() => {
          display.removeFilter(uniqueName);
        }}
      >
        <FontIcon icon="icon close" />
      </InlineButton>
    </div>
    <DataFilterControl
      filterBehaviour={computeFilterBehavoir(column, display, isDynamicStructure)}
      filter={filters[uniqueName]}
      setFilter={value => display.setFilter(uniqueName, value)}
      {driver}
      {conid}
      {database}
      {schemaName}
      {pureName}
      columnName={column ? (column.uniquePath.length == 1 ? column.uniquePath[0] : null) : uniqueName}
      foreignKey={column?.foreignKey}
      dataType={column?.dataType}
    />
  </div>
{/if}
