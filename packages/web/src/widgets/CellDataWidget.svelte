<script lang="ts" context="module">
  import { isWktGeometry } from 'dbgate-tools';

  const formats = [
    {
      type: 'textWrap',
      title: 'Text (wrap)',
      component: TextCellViewWrap,
      single: false,
    },
    {
      type: 'text',
      title: 'Text (no wrap)',
      component: TextCellViewNoWrap,
      single: false,
    },
    {
      type: 'json',
      title: 'Json',
      component: JsonCellView,
      single: true,
    },
    {
      type: 'jsonExpanded',
      title: 'Json - expanded',
      component: JsonExpandedCellView,
      single: true,
    },
    {
      type: 'jsonRow',
      title: 'Json - Row',
      component: JsonRowView,
      single: false,
    },
    {
      type: 'picture',
      title: 'Picture',
      component: PictureCellView,
      single: true,
    },
    {
      type: 'html',
      title: 'HTML',
      component: HtmlCellView,
      single: false,
    },
    {
      type: 'xml',
      title: 'XML',
      component: XmlCellView,
      single: false,
    },
    {
      type: 'map',
      title: 'Map',
      component: MapCellView,
      single: false,
    },
  ];

  function autodetect(selection) {
    if (selectionCouldBeShownOnMap(selection)) {
      return 'map';
    }

    if (selection[0]?.engine?.databaseEngineTypes?.includes('document')) {
      return 'jsonRow';
    }

    const value = selection.length == 1 ? selection[0].value : null;
    if (_.isString(value)) {
      if (value.startsWith('[') || value.startsWith('{')) return 'json';
    }
    if (_.isPlainObject(value) || _.isArray(value)) {
      return 'json';
    }
    if (typeof value === 'string' && value.startsWith('<') && value.endsWith('>')) {
      return 'xml';
    }
    return 'textWrap';
  }

  let cellSelectionListener = null;

  export const getCellSelectionListener = () => cellSelectionListener;
</script>

<script lang="ts">
  import _ from 'lodash';
  import HtmlCellView from '../celldata/HtmlCellView.svelte';
  import JsonCellView from '../celldata/JsonCellView.svelte';
  import JsonRowView from '../celldata/JsonRowView.svelte';
  import MapCellView from '../celldata/MapCellView.svelte';
  import PictureCellView from '../celldata/PictureCellView.svelte';
  import TextCellViewNoWrap from '../celldata/TextCellViewNoWrap.svelte';
  import TextCellViewWrap from '../celldata/TextCellViewWrap.svelte';
  import ErrorInfo from '../elements/ErrorInfo.svelte';
  import { selectionCouldBeShownOnMap } from '../elements/SelectionMapView.svelte';
  import SelectField from '../forms/SelectField.svelte';
  import { selectedCellsCallback } from '../stores';
  import WidgetTitle from './WidgetTitle.svelte';
  import JsonExpandedCellView from '../celldata/JsonExpandedCellView.svelte';
  import XmlCellView from '../celldata/XmlCellView.svelte';

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
        data-testid="CellDataWidget_selectFormat"
        options={[
          { value: 'autodetect', label: `Autodetect - ${autodetectFormat.title}` },
          ...formats.map(fmt => ({ label: fmt.title, value: fmt.type })),
        ]}
      />
    </div>
    <div class="data">
      {#if usedFormat.single && selection?.length != 1}
        <ErrorInfo message="Must be selected one cell" alignTop />
      {:else if usedFormat == null}
        <ErrorInfo message="Format not selected" alignTop />
      {:else if !selection || selection.length == 0}
        <ErrorInfo message="No data selected" alignTop />
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
    position: relative;
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
    position: relative;
  }
</style>
