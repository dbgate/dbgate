<script context="module">
  function getTableDisplayName(column, tables) {
    const table = (tables || []).find(x => x.designerId == column.designerId);
    if (table) return table.alias || table.pureName;
    return '';
  }
</script>

<script>
  import DataFilterControl from '../datagrid/DataFilterControl.svelte';
  import { findDesignerFilterType } from '../designer/designerTools';
  import CheckboxField from '../forms/CheckboxField.svelte';
  import SelectField from '../forms/SelectField.svelte';
  import TextField from '../forms/TextField.svelte';
  import InlineButton from '../buttons/InlineButton.svelte';
  import uuidv1 from 'uuid/v1';

  import TableControl from './TableControl.svelte';
  import FormStyledButton from '../buttons/FormStyledButton.svelte';
  import _ from 'lodash';

  export let value;
  export let onChange;

  const changeColumn = col => {
    onChange(current => ({
      ...current,
      columns: (current.columns || []).map(x =>
        x.designerId == col.designerId && x.columnName == col.columnName ? col : x
      ),
    }));
  };

  const removeColumn = col => {
    onChange(current => ({
      ...current,
      columns: (current.columns || []).filter(x => x.designerId != col.designerId || x.columnName != col.columnName),
    }));
  };

  const addExpressionColumn = () => {
    onChange(current => ({
      ...current,
      columns: [...(current.columns || []), { isCustomExpression: true, isOutput: true, designerId: uuidv1() }],
    }));
  };

  const addOrCondition = () => {
    onChange(current => ({
      ...current,
      settings: {
        ...current?.settings,
        additionalFilterCount: (current?.settings?.additionalFilterCount ?? 0) + 1,
      },
    }));
  };

  const removeOrCondition = () => {
    onChange(current => ({
      ...current,
      settings: {
        ...current?.settings,
        additionalFilterCount: (current?.settings?.additionalFilterCount ?? 1) - 1,
      },
    }));
  };

  $: columns = value?.columns;
  $: tables = value?.tables;
  $: settings = value?.settings;
  $: hasGroupedColumn = !!(columns || []).find(x => x.isGrouped);
</script>

<div class="wrapper">
  <TableControl
    rows={columns || []}
    columns={[
      { fieldName: 'columnName', slot: 8, header: 'Column/Expression' },
      { fieldName: 'tableDisplayName', header: 'Table', formatter: row => getTableDisplayName(row, tables) },
      { fieldName: 'isOutput', header: 'Output', slot: 0 },
      { fieldName: 'alias', header: 'Alias', slot: 1 },
      { fieldName: 'isGrouped', header: 'Group by', slot: 2 },
      { fieldName: 'aggregate', header: 'Aggregate', slot: 3 },
      { fieldName: 'sortOrder', header: 'Sort order', slot: 4 },
      { fieldName: 'filter', header: 'Filter', slot: 5, props: { filterField: 'filter' } },
      ..._.range(settings?.additionalFilterCount || 0).map(index => ({
        fieldName: `additionalFilter${index + 1}`,
        header: `OR Filter ${index + 2}`,
        slot: 5,
        props: { filterField: `additionalFilter${index + 1}` },
      })),
      hasGroupedColumn && { fieldName: 'groupFilter', header: 'Group filter', slot: 6 },
      { fieldName: 'actions', header: '', slot: 7 },
    ]}
  >
    <svelte:fragment slot="8" let:row>
      {#if row.isCustomExpression}
        <TextField
          style="min-width:calc(100% - 9px)"
          value={row.customExpression}
          on:input={e => {
            changeColumn({ ...row, customExpression: e.target.value });
          }}
        />
      {:else}
        {row.columnName}
      {/if}
    </svelte:fragment>

    <svelte:fragment slot="0" let:row>
      <CheckboxField
        checked={row.isOutput}
        on:change={e => {
          if (e.target.checked) changeColumn({ ...row, isOutput: true });
          else changeColumn({ ...row, isOutput: false });
        }}
      />
    </svelte:fragment>
    <svelte:fragment slot="1" let:row>
      <TextField
        style="min-width:calc(100% - 9px)"
        value={row.alias}
        on:input={e => {
          changeColumn({ ...row, alias: e.target.value });
        }}
      />
    </svelte:fragment>
    <svelte:fragment slot="2" let:row>
      <CheckboxField
        checked={row.isGrouped}
        on:change={e => {
          if (e.target.checked) changeColumn({ ...row, isGrouped: true });
          else changeColumn({ ...row, isGrouped: false });
        }}
      />
    </svelte:fragment>
    <svelte:fragment slot="3" let:row>
      {#if !row.isGrouped}
        <SelectField
          isNative
          style="min-width:calc(100% - 9px)"
          value={row.aggregate}
          on:change={e => {
            changeColumn({ ...row, aggregate: e.detail });
          }}
          options={['---', 'MIN', 'MAX', 'COUNT', 'COUNT DISTINCT', 'SUM', 'AVG'].map(x => ({ label: x, value: x }))}
        />
      {/if}
    </svelte:fragment>
    <svelte:fragment slot="4" let:row>
      <SelectField
        isNative
        style="min-width:calc(100% - 9px)"
        value={row.sortOrder}
        on:change={e => {
          changeColumn({ ...row, sortOrder: parseInt(e.detail) });
        }}
        options={[
          { label: '---', value: '0' },
          { label: '1st, ascending', value: '1' },
          { label: '1st, descending', value: '-1' },
          { label: '2nd, ascending', value: '2' },
          { label: '2nd, descending', value: '-2' },
          { label: '3rd, ascending', value: '3' },
          { label: '3rd, descending', value: '-3' },
        ]}
      />
    </svelte:fragment>
    <svelte:fragment slot="5" let:row let:filterField>
      <DataFilterControl
        filterType={findDesignerFilterType(row, value)}
        filter={row[filterField]}
        setFilter={filter => {
          changeColumn({ ...row, [filterField]: filter });
        }}
      />
    </svelte:fragment>
    <svelte:fragment slot="6" let:row>
      <DataFilterControl
        filterType={findDesignerFilterType(row, value)}
        filter={row.groupFilter}
        setFilter={groupFilter => {
          changeColumn({ ...row, groupFilter });
        }}
      />
    </svelte:fragment>
    <svelte:fragment slot="7" let:row>
      <InlineButton on:click={() => removeColumn(row)}>Remove</InlineButton>
    </svelte:fragment>
  </TableControl>
  <FormStyledButton value="Add custom expression" on:click={addExpressionColumn} style="width:200px" />
  <FormStyledButton value="Add OR condition" on:click={addOrCondition} style="width:200px" />
  {#if settings?.additionalFilterCount > 0}
    <FormStyledButton value="Remove OR condition" on:click={removeOrCondition} style="width:200px" />
  {/if}
</div>

<style>
  .wrapper {
    overflow: auto;
    flex: 1;
  }
</style>
