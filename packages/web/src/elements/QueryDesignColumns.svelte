<script context="module">
  function getTableDisplayName(column, tables) {
    const table = (tables || []).find(x => x.designerId == column.designerId);
    if (table) return table.alias || table.pureName;
    return '';
  }
</script>

<script>
  import { map } from 'lodash';
  import DataFilterControl from '../datagrid/DataFilterControl.svelte';
  import { findDesignerFilterType } from '../designer/designerTools';
  import CheckboxField from '../forms/CheckboxField.svelte';
  import SelectField from '../forms/SelectField.svelte';
  import TextField from '../forms/TextField.svelte';
  import InlineButton from './InlineButton.svelte';

  import TableControl from './TableControl.svelte';

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

  $: columns = value?.columns;
  $: tables = value?.tables;
  $: hasGroupedColumn = !!(columns || []).find(x => x.isGrouped);
</script>

<div class="wrapper">
  <TableControl
    rows={columns || []}
    columns={[
      { fieldName: 'columnName', header: 'Column/Expression' },
      { fieldName: 'tableDisplayName', header: 'Table', formatter: row => getTableDisplayName(row, tables) },
      { fieldName: 'isOutput', header: 'Output', slot: 0 },
      { fieldName: 'alias', header: 'Alias', slot: 1 },
      { fieldName: 'isGrouped', header: 'Group by', slot: 2 },
      { fieldName: 'aggregate', header: 'Aggregate', slot: 3 },
      { fieldName: 'sortOrder', header: 'Sort order', slot: 4 },
      { fieldName: 'filter', header: 'Filter', slot: 5 },
      hasGroupedColumn && { fieldName: 'groupFilter', header: 'Group filter', slot: 6 },
      { fieldName: 'actions', header: '', slot: 7 },
    ]}
  >
    <svelte:fragment slot="0" let:row>
      <CheckboxField
        checked={row.isOutput}
        onChange={e => {
          if (e.target.checked) changeColumn({ ...row, isOutput: true });
          else changeColumn({ ...row, isOutput: false });
        }}
      />
    </svelte:fragment>
    <svelte:fragment slot="1" let:row>
      <TextField
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
    <svelte:fragment slot="5" let:row>
      <DataFilterControl
        filterType={findDesignerFilterType(row, value)}
        filter={row.filter}
        setFilter={filter => {
          changeColumn({ ...row, filter });
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
</div>

<style>
  .wrapper {
    overflow: auto;
    flex: 1;
  }
</style>