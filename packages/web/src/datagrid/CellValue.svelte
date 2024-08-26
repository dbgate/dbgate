<script lang="ts">
  import _ from 'lodash';
  import { getBoolSettingsValue } from '../settings/settingsTools';
  import { stringifyCellValue } from 'dbgate-tools';

  export let rowData;
  export let value;
  export let jsonParsedValue = undefined;
  export let editorTypes;

  $: stringified = stringifyCellValue(
    value,
    'gridCellIntent',
    editorTypes,
    { useThousandsSeparator: getBoolSettingsValue('dataGrid.thousandsSeparator', false) },
    jsonParsedValue
  );
</script>

{#if rowData == null}
  <span class="null">(No row)</span>
{:else}
  <span class={stringified.gridStyle} title={stringified.gridTitle}>{stringified.value}</span>
{/if}

<style>
  .nullCellStyle {
    color: var(--theme-font-3);
    font-style: italic;
  }
  .valueCellStyle {
    color: var(--theme-icon-green);
  }
</style>
