<script lang="ts">
  import { findForeignKeyForColumn } from 'dbgate-tools';

  import ColumnLabel from '../elements/ColumnLabel.svelte';

  import CheckboxField from '../forms/CheckboxField.svelte';
  import FontIcon from '../icons/FontIcon.svelte';
  export let column;
  export let table;
  export let designer;
  export let designerId;
  export let onChangeColumn;
  export let domLine;

  $: designerColumn = (designer.columns || []).find(
    x => x.designerId == designerId && x.columnName == column.columnName
  );
</script>

<div bind:this={domLine}>
  <CheckboxField
    checked={!!(designer.columns || []).find(
      x => x.designerId == designerId && x.columnName == column.columnName && x.isOutput
    )}
    onChange={e => {
      if (e.target.checked) {
        onChangeColumn(
          {
            ...column,
            designerId,
          },
          col => ({ ...col, isOutput: true })
        );
      } else {
        onChangeColumn(
          {
            ...column,
            designerId,
          },
          col => ({ ...col, isOutput: false })
        );
      }
    }}
  />
  <ColumnLabel {...column} foreignKey={findForeignKeyForColumn(table, column)} forceIcon />
  {#if designerColumn?.filter}
    <FontIcon icon="img filter" />
  {/if}
  {#if designerColumn?.sortOrder > 0}
    <FontIcon icon="img sort-asc" />
  {/if}
  {#if designerColumn?.sortOrder < 0}
    <FontIcon icon="img sort-desc" />
  {/if}
  {#if designerColumn?.isGrouped}
    <FontIcon icon="img group" />
  {/if}
</div>
