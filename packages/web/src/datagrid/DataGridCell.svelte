<script lang="ts">
  import _, { isPlainObject } from 'lodash';
  import ShowFormButton from '../formview/ShowFormButton.svelte';
  import { detectTypeIcon, getConvertValueMenu, isJsonLikeLongString, safeJsonParse } from 'dbgate-tools';
  import { openJsonDocument } from '../tabs/JsonTab.svelte';
  import CellValue from './CellValue.svelte';
  import { openJsonLinesData } from '../utility/openJsonLinesData';
  import ShowFormDropDownButton from '../formview/ShowFormDropDownButton.svelte';

  export let rowIndex;
  export let col;
  export let rowData;
  export let colIndex = undefined;
  export let allowHintField = false;
  export let maxWidth = null;
  export let minWidth = null;

  export let isSelected = false;
  export let isFrameSelected = false;
  export let isModifiedRow = false;
  export let isModifiedCell = false;
  export let isInserted = false;
  export let isDeleted = false;
  export let isAutofillSelected = false;
  export let isFocusedColumn = false;
  export let domCell = undefined;
  export let showSlot = false;
  export let onSetFormView;
  export let isDynamicStructure = false;
  export let isAutoFillMarker = false;
  export let isCurrentCell = false;
  export let onDictionaryLookup = null;
  export let onSetValue;
  export let editorTypes = null;
  export let isReadonly;

  $: value = col.isStructured ? _.get(rowData || {}, col.uniquePath) : (rowData || {})[col.uniqueName];

  function computeStyle(maxWidth, col) {
    let res = '';

    if (col.width != null) {
      res += `width:${col.width}px; min-width:${col.width}px; max-width:${col.width}px;`;
    } else {
      if (maxWidth != null) res += `max-width:${maxWidth}px;`;
      if (minWidth != null) res += `min-width:${minWidth}px;`;
    }
    return res;
  }

  $: style = computeStyle(maxWidth, col);

  $: isJson = _.isPlainObject(value) && !(value?.type == 'Buffer' && _.isArray(value.data)) && !value.$oid;

  // don't parse JSON for explicit data types
  $: jsonParsedValue = !editorTypes?.explicitDataType && isJsonLikeLongString(value) ? safeJsonParse(value) : null;

  $: showHint = allowHintField && rowData && _.some(col.hintColumnNames, hintColumnName => rowData[hintColumnName]);
</script>

<td
  bind:this={domCell}
  data-row={rowIndex}
  data-col={colIndex == null ? col.colIndex : colIndex}
  class:isSelected
  class:isFrameSelected
  class:isModifiedRow
  class:isModifiedCell
  class:isInserted
  class:isDeleted
  class:isAutofillSelected
  class:isFocusedColumn
  class:alignRight={_.isNumber(value) && !showHint}
  {style}
>
  <CellValue {rowData} {value} {jsonParsedValue} {editorTypes} />

  {#if showHint}
    <span class="hint"
      >{col.hintColumnNames.map(hintColumnName => rowData[hintColumnName]).join(col.hintColumnDelimiter || ' ')}</span
    >
  {/if}

  {#if editorTypes?.explicitDataType}
    {#if value !== undefined}
      <ShowFormDropDownButton
        icon={detectTypeIcon(value)}
        menu={() => getConvertValueMenu(value, onSetValue, editorTypes)}
      />
    {/if}
    {#if _.isPlainObject(value)}
      <ShowFormButton secondary icon="icon open-in-new" on:click={() => openJsonDocument(value, undefined, true)} />
    {/if}
    {#if _.isArray(value)}
      <ShowFormButton
        secondary
        icon="icon open-in-new"
        on:click={() => {
          if (_.every(value, x => _.isPlainObject(x))) {
            openJsonLinesData(value);
          } else {
            openJsonDocument(value, undefined, true);
          }
        }}
      />
    {/if}
  {:else if col.foreignKey && rowData && rowData[col.uniqueName] && !isCurrentCell}
    <ShowFormButton on:click={() => onSetFormView(rowData, col)} />
  {:else if col.foreignKey && isCurrentCell && onDictionaryLookup && !isReadonly}
    <ShowFormButton icon="icon dots-horizontal" on:click={onDictionaryLookup} />
  {:else if isJson}
    <ShowFormButton icon="icon open-in-new" on:click={() => openJsonDocument(value, undefined, true)} />
  {:else if jsonParsedValue && _.isPlainObject(jsonParsedValue)}
    <ShowFormButton icon="icon open-in-new" on:click={() => openJsonDocument(jsonParsedValue, undefined, true)} />
  {:else if _.isArray(jsonParsedValue || value)}
    <ShowFormButton
      icon="icon open-in-new"
      on:click={() => {
        if (_.every(jsonParsedValue || value, x => _.isPlainObject(x))) {
          openJsonLinesData(jsonParsedValue || value);
        } else {
          openJsonDocument(jsonParsedValue || value, undefined, true);
        }
      }}
    />
  {/if}

  {#if isAutoFillMarker}
    <div class="autoFillMarker autofillHandleMarker" />
  {/if}

  {#if showSlot}
    <slot />
  {/if}
</td>

<!-- {#if _.isArray(value.data)}
{#if value.data.length == 1 && isTypeLogical(col.dataType)}
  {value.data[0]}
{:else}
  <span class="null">({value.data.length} bytes)</span>
{/if}
{:else}
<span class="null">(RAW)</span>
{/if} -->
<style>
  td {
    font-weight: normal;
    border: 1px solid var(--theme-border);
    padding: 2px;
    white-space: nowrap;
    position: relative;
    overflow: hidden;
  }
  td.isFrameSelected {
    outline: 3px solid var(--theme-bg-selected);
    outline-offset: -3px;
  }
  td.isAutofillSelected {
    outline: 3px solid var(--theme-bg-selected);
    outline-offset: -3px;
  }
  td.isFocusedColumn {
    background: var(--theme-bg-alt);
  }
  td.isModifiedRow {
    background: var(--theme-bg-gold);
  }
  td.isModifiedCell {
    background: var(--theme-bg-orange);
  }
  td.isInserted {
    background: var(--theme-bg-green);
  }
  td.isDeleted {
    background: var(--theme-bg-volcano);
  }
  td.isSelected {
    background: var(--theme-bg-3);
  }
  :global(.data-grid-focused) td.isSelected {
    background: var(--theme-bg-selected);
  }
  td.isDeleted {
    background-image: url('data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAUAAAAFCAYAAACNbyblAAAAEElEQVQImWNgIAX8x4KJBAD+agT8INXz9wAAAABJRU5ErkJggg==');
    background-repeat: repeat-x;
    background-position: 50% 50%;
  }

  .hint {
    color: var(--theme-font-3);
    margin-left: 5px;
  }

  .autoFillMarker {
    width: 8px;
    height: 8px;
    background: var(--theme-bg-selected-point);
    position: absolute;
    right: 0px;
    bottom: 0px;
    overflow: visible;
    cursor: crosshair;
  }

  .alignRight {
    color: var(--theme-icon-green);
    text-align: var(--data-grid-numbers-align);
  }
</style>
