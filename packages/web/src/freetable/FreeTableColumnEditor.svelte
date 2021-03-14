<script context="module">
  function dispatchChangeColumns(props, func, rowFunc = null) {
    const { modelState, dispatchModel } = props;
    const model = modelState.value;

    dispatchModel({
      type: 'set',
      value: {
        rows: rowFunc ? model.rows.map(rowFunc) : model.rows,
        structure: {
          ...model.structure,
          columns: func(model.structure.columns),
        },
      },
    });
  }

  function exchange(array, i1, i2) {
    const i1r = (i1 + array.length) % array.length;
    const i2r = (i2 + array.length) % array.length;
    const res = [...array];
    [res[i1r], res[i2r]] = [res[i2r], res[i1r]];
    return res;
  }
</script>

<script>
  import _ from 'lodash';
  import ManagerInnerContainer from '../elements/ManagerInnerContainer.svelte';
  import ColumnManagerRow from './ColumnManagerRow.svelte';
  import ColumnNameEditor from './ColumnNameEditor.svelte';

  export let modelState;
  export let dispatchModel;
  export let managerSize;

  let editingColumn = null;

  $: structure = modelState.value.structure;
</script>

<ManagerInnerContainer width={managerSize}>
  {#each structure.columns as column, index}
    {#if index == editingColumn}
      <ColumnNameEditor
        defaultValue={column.columnName}
        onEnter={columnName => {
          dispatchChangeColumns(
            $$props,
            cols => cols.map((col, i) => (index == i ? { columnName } : col)),
            row => _.mapKeys(row, (v, k) => (k == column.columnName ? columnName : k))
          );
        }}
        onBlur={() => (editingColumn = null)}
        focusOnCreate
        blurOnEnter
        existingNames={structure.columns.map(x => x.columnName)}
      />
    {:else}
      <ColumnManagerRow
        {column}
        onEdit={() => (editingColumn = index)}
        onRemove={() => {
          dispatchChangeColumns($$props, cols => cols.filter((c, i) => i != index));
        }}
        onUp={() => {
          dispatchChangeColumns($$props, cols => exchange(cols, index, index - 1));
        }}
        onDown={() => {
          dispatchChangeColumns($$props, cols => exchange(cols, index, index + 1));
        }}
      />
    {/if}
  {/each}
  <ColumnNameEditor
    onEnter={columnName => {
      dispatchChangeColumns($$props, cols => [...cols, { columnName }]);
    }}
    placeholder="New column"
    existingNames={structure.columns.map(x => x.columnName)}
  />
</ManagerInnerContainer>
