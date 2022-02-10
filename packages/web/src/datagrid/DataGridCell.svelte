<script context="module">
  function makeBulletString(value) {
    return _.pad('', value.length, '•');
  }

  function highlightSpecialCharacters(value) {
    value = value.replace(/\n/g, '↲');
    value = value.replace(/\r/g, '');
    value = value.replace(/^(\s+)/, makeBulletString);
    value = value.replace(/(\s+)$/, makeBulletString);
    value = value.replace(/(\s\s+)/g, makeBulletString);
    return value;
  }

  // const dateTimeRegex = /^\d\d\d\d-\d\d-\d\dT\d\d:\d\d:\d\d(\.\d\d\d)?Z?$/;
  const dateTimeRegex = /^([0-9]+)-(0[1-9]|1[012])-(0[1-9]|[12][0-9]|3[01])[Tt]([01][0-9]|2[0-3]):([0-5][0-9]):([0-5][0-9]|60)(\.[0-9]+)?(([Zz])|()|([\+|\-]([01][0-9]|2[0-3]):[0-5][0-9]))$/;

  function formatNumber(value) {
    if (value >= 10000 || value <= -10000) {
      if (getBoolSettingsValue('dataGrid.thousandsSeparator', false)) {
        return value.toLocaleString();
      } else {
        return value.toString();
      }
    }

    return value.toString();
  }

  function formatDateTime(testedString) {
    const m = testedString.match(dateTimeRegex);
    return `${m[1]}-${m[2]}-${m[3]} ${m[4]}:${m[5]}:${m[6]}`;
  }
</script>

<script lang="ts">
  import _, { join } from 'lodash';
  import ShowFormButton from '../formview/ShowFormButton.svelte';
  import { getBoolSettingsValue } from '../settings/settingsTools';
  import { arrayToHexString, isJsonLikeLongString, safeJsonParse } from 'dbgate-tools';
  import { showModal } from '../modals/modalTools';
  import DictionaryLookupModal from '../modals/DictionaryLookupModal.svelte';
  import { openJsonDocument } from '../tabs/JsonTab.svelte';
  import openNewTab from '../utility/openNewTab';

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
  {#if rowData == null}
    <span class="null">(No row)</span>
  {:else if value === null}
    <span class="null">(NULL)</span>
  {:else if value === undefined}
    <span class="null">(No field)</span>
  {:else if _.isDate(value)}
    {value.toString()}
  {:else if value === true}
    <span class="value">true</span>
  {:else if value === false}
    <span class="value">false</span>
  {:else if _.isNumber(value)}
    <span class="value">{formatNumber(value)}</span>
  {:else if _.isString(value) && !jsonParsedValue}
    {#if dateTimeRegex.test(value)}
      <span class="value">
        {formatDateTime(value)}
      </span>
    {:else}
      {highlightSpecialCharacters(value)}
    {/if}
  {:else if value?.type == 'Buffer' && _.isArray(value.data)}
    {#if value.data.length <= 16}
      <span class="value">{'0x' + arrayToHexString(value.data)}</span>
    {:else}
      <span class="null">({value.data.length} bytes)</span>
    {/if}
  {:else if value.$oid}
    <span class="value">ObjectId("{value.$oid}")</span>
  {:else if _.isPlainObject(value)}
    <span class="null" title={JSON.stringify(value, undefined, 2)}>(JSON)</span>
  {:else if _.isArray(value)}
    <span class="null" title={value.map(x => JSON.stringify(x)).join('\n')}>[{value.length} items]</span>
  {:else if _.isPlainObject(jsonParsedValue)}
    <span class="null" title={JSON.stringify(jsonParsedValue, undefined, 2)}>(JSON)</span>
  {:else if _.isArray(jsonParsedValue)}
    <span class="null" title={jsonParsedValue.map(x => JSON.stringify(x)).join('\n')}
      >[{jsonParsedValue.length} items]</span
    >
  {:else}
    {value.toString()}
  {/if}

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
      on:click={() =>
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
        )}
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
    background-image: url('data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAUAAAAFCAYAAACNbyblAAAAEElEQVQImWNgIAX8x4KJBAD+agT8INXz9wAAAABJRU5ErkJggg==');
    background-repeat: repeat-x;
    background-position: 50% 50%;
  }
  td.isSelected {
    background: var(--theme-bg-selected);
  }

  .hint {
    color: var(--theme-font-3);
    margin-left: 5px;
  }
  .null {
    color: var(--theme-font-3);
    font-style: italic;
  }
  .value {
    color: var(--theme-icon-green);
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
