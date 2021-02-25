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

  const dateTimeRegex = /^\d\d\d\d-\d\d-\d\dT\d\d:\d\d:\d\d(\.\d\d\d)?Z?$/;
</script>

<script lang="ts">
  import moment from 'moment';
  import _ from 'lodash';
  import { isTypeLogical } from 'dbgate-tools';

  export let rowIndex;
  export let col;
  export let rowData;
  export let hintFieldsAllowed = undefined;

  export let isSelected = false;
  export let isFrameSelected = false;
  export let isModifiedRow = false;
  export let isModifiedCell = false;
  export let isInserted = false;
  export let isDeleted = false;

  $: value = rowData[col.uniqueName];
</script>

<td
  data-row={rowIndex}
  data-col={col.colIndex}
  class:isSelected
  class:isFrameSelected
  class:isModifiedRow
  class:isModifiedCell
  class:isInserted
  class:isDeleted
>
  {#if value == null}
    <span class="null">(NULL)</span>
  {:else if _.isDate(value)}
    {moment(value).format('YYYY-MM-DD HH:mm:ss')}
  {:else if value === true}
    1
  {:else if value === false}
    0
  {:else if _.isNumber(value)}
    {#if value >= 10000 || value <= -10000}
      {value.toLocaleString()}
    {:else}
      {value.toString()}
    {/if}
  {:else if _.isString(value)}
    {#if dateTimeRegex.test(value)}
      {moment(value).format('YYYY-MM-DD HH:mm:ss')}
    {:else}
      {highlightSpecialCharacters(value)}
    {/if}
  {:else if _.isPlainObject(value)}
    {#if _.isArray(value.data)}
      {#if value.data.length == 1 && isTypeLogical(col.dataType)}
        {value.data[0]}
      {:else}
        <span class="null">({value.data.length} bytes)</span>
      {/if}
    {:else}
      <span class="null">(RAW)</span>
    {/if}
  {:else}
    {value.toString()}
  {/if}

  {#if hintFieldsAllowed && hintFieldsAllowed.includes(col.uniqueName)}
    <span class="hint">{rowData[col.hintColumnName]}</span>
  {/if}
</td>

<style>
  td {
    font-weight: normal;
    border: 1px solid var(--theme-border);
    padding: 2px;
    white-space: nowrap;
    position: relative;
    overflow: hidden;
  }
  td.isSelected {
    background: var(--theme-bg-selected);
  }
  td.isFrameSelected {
    outline: 3px solid var(--theme-bg-selected);
    outline-offset: -3px;
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

  .hint {
    color: var(--theme-font-3);
    margin-left: 5px;
  }
  .null {
    color: var(--theme-font-3);
    font-style: italic;
  }
</style>
