<script lang="ts" context="module">
  const formats = [
    {
      type: 'textWrap',
      title: 'Text (wrap)',
      component: TextCellViewWrap,
      single: true,
    },
    {
      type: 'text',
      title: 'Text (no wrap)',
      component: TextCellViewNoWrap,
      single: true,
    },
    {
      type: 'json',
      title: 'Json',
      component: JsonCellView,
      single: true,
    },
  ];

  function autodetect(selection) {
    const value = selection.length == 1 ? selection[0].value : null;
    if (_.isString(value)) {
      if (value.startsWith('[') || value.startsWith('{')) return 'json';
    }
    return 'textWrap';
  }

  let cellSelectionListener = null;

  export const getCellSelectionListener = () => cellSelectionListener;
</script>

<script lang="ts">
  import _ from 'lodash';
  import { onMount } from 'svelte';

  import JsonCellView from '../celldata/JsonCellView.svelte';
  import TextCellViewNoWrap from '../celldata/TextCellViewNoWrap.svelte';
  import TextCellViewWrap from '../celldata/TextCellViewWrap.svelte';
  import ErrorInfo from '../elements/ErrorInfo.svelte';
  import SelectField from '../forms/SelectField.svelte';
  import { selectedCellsCallback } from '../stores';
  import WidgetTitle from './WidgetTitle.svelte';

  let selectedFormatType = 'autodetect';

  export let selection = undefined;

  $: autodetectFormatType = autodetect(selection);
  $: autodetectFormat = formats.find(x => x.type == autodetectFormatType);

  $: usedFormatType = selectedFormatType == 'autodetect' ? autodetectFormatType : selectedFormatType;
  $: usedFormat = formats.find(x => x.type == usedFormatType);

  $: selection = $selectedCellsCallback ? $selectedCellsCallback() : [];
</script>

<div class="wrapper">
  <WidgetTitle>Cell data view</WidgetTitle>
  <div class="main">
    <div class="toolbar">
      Format:<span>&nbsp;</span>
      <SelectField
        isNative
        value={selectedFormatType}
        on:change={e => (selectedFormatType = e.detail)}
        options={[
          { value: 'autodetect', label: `Autodetect - ${autodetectFormat.title}` },
          ...formats.map(fmt => ({ label: fmt.title, value: fmt.type })),
        ]}
      />
    </div>
    <div class="data">
      {#if usedFormat.single && selection?.length != 1}
        <ErrorInfo message="Must be selected one cell" />
      {:else if usedFormat == null}
        <ErrorInfo message="Format not selected" />
      {:else if !selection || selection.length == 0}
        <ErrorInfo message="No data selected" />
      {:else}
        <svelte:component this={usedFormat?.component} {selection} />
      {/if}
    </div>
  </div>
</div>

<style>
  .wrapper {
    flex: 1;
    display: flex;
    flex-direction: column;
  }

  .main {
    display: flex;
    flex: 1;
    flex-direction: column;
  }

  .toolbar {
    display: flex;
    background: var(--theme-bg-1);
    align-items: center;
    border-bottom: 1px solid var(--thene-border);
    margin: 2px;
  }

  .data {
    display: flex;
    flex: 1;
  }
</style>
