<script lang="ts" context="module">
  function getTimeAxis(labels) {
    const res = [];
    for (const label of labels) {
      const parsed = moment(label);
      if (!parsed.isValid()) return null;
      const iso = parsed.toISOString();
      if (iso < '1850-01-01T00:00:00' || iso > '2150-01-01T00:00:00') return null;
      res.push(parsed);
    }
    return res;
  }

  function getLabels(labelValues, timeAxis, chartType) {
    if (!timeAxis) return labelValues;
    if (chartType === 'line') return timeAxis.map(x => x.toDate());
    return timeAxis.map(x => x.format('D. M. YYYY'));
  }

  function getOptions(timeAxis, chartType) {
    const res = {
      scales: {},
    };
    if (timeAxis && chartType === 'line') {
      res.scales = {
        x: {
          type: 'time',
          distribution: 'linear',

          time: {
            tooltipFormat: 'D. M. YYYY HH:mm',
            displayFormats: {
              millisecond: 'HH:mm:ss.SSS',
              second: 'HH:mm:ss',
              minute: 'HH:mm',
              hour: 'D.M hA',
              day: 'D. M.',
              week: 'D. M. YYYY',
              month: 'MM-YYYY',
              quarter: '[Q]Q - YYYY',
              year: 'YYYY',
            },
          },
        },
      };
    }
    return res;
  }

  function getPlugins(chartTitle) {
    const res = {};
    if (chartTitle) {
      res['title'] = {
        display: true,
        text: chartTitle,
      };
    }
    res['zoom'] = {
      zoom: {
        wheel: {
          enabled: true,
        },
        pinch: {
          enabled: true,
        },
        drag: {
          enabled: true,
          modifierKey: 'shift',
        },
        mode: 'x',
      },
      pan: {
        enabled: true,
        mode: 'x',
      },
    };

    return res;
  }

  function createChartData(
    freeData,
    labelColumn,
    dataColumns,
    colorSeed,
    chartType,
    chartTitle,
    fillLineChart,
    dataColumnColors,
    dataColumnLabels,
    themeDef
  ) {
    if (!freeData || !labelColumn || !dataColumns || !freeData.rows || dataColumns.length == 0) return null;
    const palettes = themeDef?.themeType == 'dark' ? presetDarkPalettes : presetPalettes;
    const colors = randomcolor({
      count: _.max([freeData.rows.length, dataColumns.length, 1]),
      seed: colorSeed,
    });
    let backgroundColor = null;
    let borderColor = null;
    const labelValues = freeData.rows.map(x => x[labelColumn]);
    const timeAxis = getTimeAxis(labelValues);
    const labels = getLabels(labelValues, timeAxis, chartType);
    const res = {
      labels,
      datasets: dataColumns.map((dataColumn, columnIndex) => {
        const label = dataColumnLabels[dataColumn];
        if (chartType == 'line' || chartType == 'bar') {
          const color = dataColumnColors[dataColumn];
          if (color) {
            backgroundColor = palettes[color][4] + '80';
            borderColor = palettes[color][7];
          } else {
            backgroundColor = colors[columnIndex] + '80';
            borderColor = colors[columnIndex];
          }
        } else {
          backgroundColor = colors;
        }

        return {
          label: label || dataColumn,
          data: freeData.rows.map(row => row[dataColumn]),
          backgroundColor,
          borderColor,
          borderWidth: 1,
          fill: fillLineChart == false ? false : true,
        };
      }),
    };

    const options = getOptions(timeAxis, chartType);
    const plugins = getPlugins(chartTitle);

    // console.log('RES', res);
    // console.log('OPTIONS', options);

    return [res, options, plugins];
  }
</script>

<script lang="ts">
  import _ from 'lodash';
  import randomcolor from 'randomcolor';
  import moment from 'moment';
  import ChartCore from './ChartCore.svelte';
  import { getFormContext } from '../forms/FormProviderCore.svelte';
  import { generate, presetPalettes, presetDarkPalettes, presetPrimaryColors } from '@ant-design/colors';
  import { extractDataColumnColors, extractDataColumnLabels, extractDataColumns } from './chartDataLoader';
  import { currentThemeDefinition } from '../stores';

  export let data;
  // export let menu;

  const { values } = getFormContext();

  let clientWidth;
  let clientHeight;

  $: dataColumns = extractDataColumns($values);
  $: dataColumnColors = extractDataColumnColors($values, dataColumns);
  $: dataColumnLabels = extractDataColumnLabels($values, dataColumns);

  $: chartData = createChartData(
    data,
    $values.labelColumn,
    dataColumns,
    $values.colorSeed || '5',
    $values.chartType,
    $values.chartTitle,
    $values.fillLineChart,
    dataColumnColors,
    dataColumnLabels,
    $currentThemeDefinition
  );
</script>

<div class="wrapper" bind:clientWidth bind:clientHeight>
  {#if chartData}
    {#key `${$values.chartType}|${clientWidth}|${clientHeight}`}
      <ChartCore
        width={clientWidth}
        height={clientHeight}
        data={chartData[0]}
        type={$values.chartType}
        title={$values.chartTitle}
        options={{ ...chartData[1], plugins: chartData[2] }}
      />
    {/key}
  {/if}
</div>

<style>
  .wrapper {
    flex: 1;
    overflow: hidden;
  }
</style>
