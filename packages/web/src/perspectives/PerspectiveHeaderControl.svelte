<script lang="ts">
  import { ChangePerspectiveConfigFunc, PerspectiveConfig, PerspectiveDisplayColumn } from 'dbgate-datalib';
  import _ from 'lodash';

  import DropDownButton from '../buttons/DropDownButton.svelte';
  import FontIcon from '../icons/FontIcon.svelte';
  export let column: PerspectiveDisplayColumn;
  export let columnLevel;
  export let config: PerspectiveConfig;
  export let setConfig: ChangePerspectiveConfigFunc;

  let mouseIn;

  $: parentUniqueName = column.dataNode?.parentNode?.uniqueName || '';
  $: uniqueName = column.dataNode.uniqueName;
  $: order = config.sort?.[parentUniqueName]?.find(x => x.uniqueName == uniqueName)?.order;
  $: orderIndex =
    config.sort?.[parentUniqueName]?.length > 1
      ? _.findIndex(config.sort?.[parentUniqueName], x => x.uniqueName == uniqueName)
      : -1;
  $: isSortDefined = config.sort?.[parentUniqueName]?.length > 0;

  const setSort = order => {
    setConfig(
      cfg => ({
        ...cfg,
        sort: {
          ...cfg.sort,
          [parentUniqueName]: [{ uniqueName, order }],
        },
      }),
      true
    );
  };

  const addToSort = order => {
    setConfig(
      cfg => ({
        ...cfg,
        sort: {
          ...cfg.sort,
          [parentUniqueName]: [...(cfg.sort?.[parentUniqueName] || []), { uniqueName, order }],
        },
      }),
      true
    );
  };

  const clearSort = () => {
    setConfig(
      cfg => ({
        ...cfg,
        sort: {
          ...cfg.sort,
          [parentUniqueName]: [],
        },
      }),
      true
    );
  };

  function getMenu() {
    return [
      { onClick: () => setSort('ASC'), text: 'Sort ascending' },
      { onClick: () => setSort('DESC'), text: 'Sort descending' },
      isSortDefined && !order && { onClick: () => addToSort('ASC'), text: 'Add to sort - ascending' },
      isSortDefined && !order && { onClick: () => addToSort('DESC'), text: 'Add to sort - descending' },
      order && { onClick: () => clearSort(), text: 'Clear sort criteria' },
    ];
  }
</script>

{#if column.isVisible(columnLevel)}
  <th
    rowspan={column.rowSpan}
    class="columnHeader"
    on:mouseenter={() => (mouseIn = true)}
    on:mouseleave={() => (mouseIn = false)}
  >
    <div class="wrap">
      <div class="label">
        {column.title}
      </div>

      {#if order == 'ASC'}
        <span class="icon">
          <FontIcon icon="img sort-asc" />
          {#if orderIndex >= 0}
            <span class="color-icon-green order-index">{orderIndex + 1}</span>
          {/if}
        </span>
      {/if}
      {#if order == 'DESC'}
        <span class="icon">
          <FontIcon icon="img sort-desc" />
          {#if orderIndex >= 0}
            <span class="color-icon-green order-index">{orderIndex + 1}</span>
          {/if}
        </span>
      {/if}
    </div>

    {#if mouseIn}
      <div class="menuButton">
        <DropDownButton menu={getMenu} narrow />
      </div>
    {/if}
  </th>
{/if}
{#if column.showParent(columnLevel)}
  <th colspan={column.getColSpan(columnLevel)} class="tableHeader">{column.getParentName(columnLevel)}</th>
{/if}

<style>
  .wrap {
    display: flex;
  }
  .menuButton {
    position: absolute;
    right: 0;
    bottom: 0;
  }
  .label {
    flex-wrap: nowrap;
  }
  .order-index {
    font-size: 10pt;
    margin-left: -3px;
    margin-right: 2px;
    top: -1px;
    position: relative;
  }
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
  /* .resizer {
      background-color: var(--theme-border);
      width: 2px;
      cursor: col-resize;
      z-index: 1;
    } */
  .grouping {
    color: var(--theme-font-alt);
    white-space: nowrap;
  }
  .data-type {
    color: var(--theme-font-3);
  }

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
</style>
