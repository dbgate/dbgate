<script lang="ts">
  import { PerspectiveDisplayColumn } from 'dbgate-datalib';
  import type { ChangePerspectiveConfigFunc, PerspectiveConfig } from 'dbgate-datalib';
  import _, { mapKeys } from 'lodash';

  import DropDownButton from '../buttons/DropDownButton.svelte';
  import FontIcon from '../icons/FontIcon.svelte';
  import SortOrderIcon from '../designer/SortOrderIcon.svelte';
  export let column: PerspectiveDisplayColumn;
  export let columnLevel;
  export let config: PerspectiveConfig;
  export let setConfig: ChangePerspectiveConfigFunc;

  $: order = column.dataNode?.sortOrder;
  $: orderIndex = column.dataNode?.sortOrderIndex;
</script>

{#if column.isVisible(columnLevel)}
  <th rowspan={column.rowSpan} class="columnHeader" data-column={column.columnIndex}>
    <div class="wrap">
      <div class="label">
        {column.title}
      </div>

      <SortOrderIcon {order} {orderIndex} />
    </div>
  </th>
{/if}
{#if column.showParent(columnLevel)}
  <th
    colspan={column.getColSpan(columnLevel)}
    class="tableHeader"
    data-tableNodeDesignerId={column.getParentTableDesignerId(columnLevel)}
  >
    <div class="wrap">
      {column.getParentName(columnLevel)}
      {#if column.getParentNode(columnLevel)?.isParentFilter}
        <span class="icon">
          <FontIcon icon="img parent-filter" />
        </span>
      {/if}
    </div>
  </th>
{/if}

<style>
  .wrap {
    display: flex;
  }
  .label {
    flex-wrap: nowrap;
  }
  /* .order-index {
    font-size: 10pt;
    margin-left: -3px;
    margin-right: 2px;
    top: -1px;
    position: relative;
  } */
  .label {
    flex: 1;
    min-width: 10px;
    padding: 2px;
    margin: auto;
    white-space: nowrap;
  }
  .icon {
    margin-left: 3px;
    align-self: center;
    font-size: 18px;
  }

  th {
    text-align: left;
    padding: 2px;
    margin: 0;
    background: var(--theme-table-header-background);
    overflow: hidden;
    vertical-align: center;
    z-index: 100;
    font-weight: normal;

    border-bottom: var(--theme-table-border);
    border-right: var(--theme-table-border);
  }

  th.tableHeader {
    font-weight: bold;
  }

  th.columnHeader {
    position: relative;
  }

  th:global(.highlight) {
    border: var(--theme-cell-active-border);
    padding: 0px;
  }
</style>
