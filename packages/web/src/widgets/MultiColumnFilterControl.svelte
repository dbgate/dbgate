<script lang="ts">
  import { evalFilterBehaviour } from 'dbgate-tools';
  import DataFilterControl from '../datagrid/DataFilterControl.svelte';
  import InlineButton from '../buttons/InlineButton.svelte';
  import SelectField from '../forms/SelectField.svelte';
  import _ from 'lodash';
  import FontIcon from '../icons/FontIcon.svelte';

  export let compoudFilter: { [key: string]: string };
  export let onSetCompoudFilter;
  export let columnNames: string[];
  export let filterBehaviour = evalFilterBehaviour;

  $: columnsReal = Object.keys(compoudFilter || {});
  $: columnsUsed = columnsReal.length > 0 ? columnsReal : [columnNames[0]];
</script>

{#each columnsUsed as column, index}
  <div class="flex">
    <SelectField
      isNative
      value={column}
      on:change={e => {
        const keys = Object.keys(compoudFilter || {});
        const values = Object.values(compoudFilter || {});
        keys[index] = e.detail;
        const newFilter = _.zipObject(keys, values);
        onSetCompoudFilter(newFilter);
      }}
      options={columnNames.map(col => ({
        label: col,
        value: col,
      })) || []}
    />

    <DataFilterControl
      {filterBehaviour}
      filter={compoudFilter?.[column] ?? ''}
      setFilter={value => {
        onSetCompoudFilter({
          ...compoudFilter,
          [column]: value,
        });
      }}
      placeholder="Filter"
    />

    {#if index == 0}
      <InlineButton
        on:click={() => {
          const newColumn = columnNames.find(x => !columnsUsed.includes(x));
          if (!newColumn) return;
          onSetCompoudFilter({
            ...compoudFilter,
            [newColumn]: '',
          });
        }}
        title="Add filter column"
        square
      >
        <FontIcon icon="icon plus-thick" />
      </InlineButton>
    {:else}
      <InlineButton
        on:click={() => {
          onSetCompoudFilter(_.omit(compoudFilter, column));
        }}
        title="Remove filter column"
        square
      >
        <FontIcon icon="icon minus-thick" />
      </InlineButton>
    {/if}
  </div>
{/each}
