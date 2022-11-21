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
  /* .grouping {
    color: var(--theme-font-alt);
    white-space: nowrap;
  }
  .data-type {
    color: var(--theme-font-3);
  } */

  th {
    /* border: 1px solid var(--theme-border); */
    text-align: left;
    padding: 2px;
    margin: 0;
    background-color: var(--theme-bg-1);
    overflow: hidden;
    vertical-align: center;
    z-index: 100;
    font-weight: normal;

    border-bottom: 1px solid var(--theme-border);
    border-right: 1px solid var(--theme-border);
  }

  th.tableHeader {
    font-weight: bold;
  }

  th.columnHeader {
    position: relative;
  }

  th:global(.highlight) {
    border: 3px solid var(--theme-icon-blue);
    padding: 0px;
  }
</style>
