<script lang="ts">
  import _, { isPlainObject, join } from 'lodash';
  import ShowFormButton from '../formview/ShowFormButton.svelte';
  import { getBoolSettingsValue } from '../settings/settingsTools';
  import { arrayToHexString, isJsonLikeLongString, safeJsonParse } from 'dbgate-tools';
  import { showModal } from '../modals/modalTools';
  import DictionaryLookupModal from '../modals/DictionaryLookupModal.svelte';
  import { openJsonDocument } from '../tabs/JsonTab.svelte';
  import openNewTab from '../utility/openNewTab';
  import CellValue from './CellValue.svelte';

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
  $: jsonParsedValue = isJsonLikeLongString(value) ? safeJsonParse(value) : null;
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
  {style}
>
  <CellValue {rowData} {value} {jsonParsedValue} />

  {#if allowHintField && rowData && _.some(col.hintColumnNames, hintColumnName => rowData[hintColumnName])}
    <span class="hint"
      >{col.hintColumnNames.map(hintColumnName => rowData[hintColumnName]).join(col.hintColumnDelimiter || ' ')}</span
    >
  {/if}

  {#if col.foreignKey && rowData && rowData[col.uniqueName] && !isCurrentCell}
    <ShowFormButton on:click={() => onSetFormView(rowData, col)} />
  {/if}

  {#if col.foreignKey && isCurrentCell && onDictionaryLookup}
    <ShowFormButton icon="icon dots-horizontal" on:click={onDictionaryLookup} />
  {/if}

  {#if isJson}
    <ShowFormButton icon="icon open-in-new" on:click={() => openJsonDocument(value, undefined, true)} />
  {/if}

  {#if jsonParsedValue && _.isPlainObject(jsonParsedValue)}
    <ShowFormButton icon="icon open-in-new" on:click={() => openJsonDocument(jsonParsedValue, undefined, true)} />
  {/if}

  {#if _.isArray(jsonParsedValue || value)}
    <ShowFormButton
      icon="icon open-in-new"
      on:click={() => {
        if (_.every(jsonParsedValue || value, x => _.isPlainObject(x))) {
          openNewTab(
            {
              title: 'Data #',
              icon: 'img free-table',
              tabComponent: 'FreeTableTab',
              props: {},
            },
            {
              editor: {
                rows: jsonParsedValue || value,
                structure: { __isDynamicStructure: true, columns: [] },
              },
            }
          );
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
</style>
