<script lang="ts">
  import { getAsImageSrc, safeJsonParse, stringifyCellValue } from 'dbgate-tools';
  import _ from 'lodash';

  import CellValue from '../datagrid/CellValue.svelte';
  import JSONTree from '../jsontree/JSONTree.svelte';

  export let value;
  export let rowSpan;
  export let rowData;
  export let columnIndex;
  export let displayType;

  function getValueAsText(value, force) {
    if (force && value?.type == 'Buffer' && _.isArray(value.data)) {
      return String.fromCharCode.apply(String, value.data);
    }
    return stringifyCellValue(value, 'gridCellIntent').value;
  }
</script>

<td rowspan={rowSpan} data-column={columnIndex} class:isEmpty={value === undefined}>
  {#if value !== undefined}
    {#if displayType == 'json'}
      <JSONTree value={safeJsonParse(value, value?.toString())} slicedKeyCount={1} disableContextMenu />
    {:else if displayType == 'image'}
      {@const src = getAsImageSrc(value)}
      {#if src}
        <img {src} />
      {:else}
        <span class="null"> (no image)</span>
      {/if}
    {:else if displayType == 'text'}
      {getValueAsText(value, false)}
    {:else if displayType == 'forceText'}
      {getValueAsText(value, true)}
    {:else if !value?.$oid && (_.isArray(value) || _.isPlainObject(value))}
      <JSONTree {value} slicedKeyCount={1} disableContextMenu />
    {:else}
      <CellValue {rowData} {value} />
    {/if}
  {/if}
</td>

<style>
  td {
    font-weight: normal;
    /* border: 1px solid var(--theme-border); */
    background-color: var(--theme-bg-0);
    padding: 2px;
    position: relative;
    overflow: hidden;
    vertical-align: top;
    border-bottom: 1px solid var(--theme-border);
    border-right: 1px solid var(--theme-border);
  }

  td.isEmpty {
    background-color: var(--theme-bg-1);
  }

  td:global(.highlight) {
    border: 3px solid var(--theme-icon-blue);
    padding: 0px;
  }
  .null {
    color: var(--theme-font-3);
    font-style: italic;
  }
</style>
