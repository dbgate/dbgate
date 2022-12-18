<script lang="ts" context="module">
  const getCurrentEditor = () => getActiveComponent('ProfilerTab');

  registerCommand({
    id: 'profiler.start',
    category: 'Profiler',
    name: 'Start profiling',
    icon: 'icon play',
    testEnabled: () => getCurrentEditor()?.startProfilingEnabled(),
    onClick: () => getCurrentEditor().startProfiling(),
  });

  registerCommand({
    id: 'profiler.stop',
    category: 'Profiler',
    name: 'Stop profiling',
    icon: 'icon play-stop',
    testEnabled: () => getCurrentEditor()?.stopProfilingEnabled(),
    onClick: () => getCurrentEditor().stopProfiling(),
  });

  registerCommand({
    id: 'profiler.save',
    category: 'Profiler',
    name: 'Save',
    icon: 'icon save',
    testEnabled: () => getCurrentEditor()?.saveEnabled(),
    onClick: () => getCurrentEditor().save(),
  });
</script>

<script>
  import { findEngineDriver } from 'dbgate-tools';

  import { onDestroy, onMount } from 'svelte';

  import ToolStripCommandButton from '../buttons/ToolStripCommandButton.svelte';
  import ToolStripContainer from '../buttons/ToolStripContainer.svelte';
  import invalidateCommands from '../commands/invalidateCommands';
  import registerCommand from '../commands/registerCommand';
  import JslDataGrid from '../datagrid/JslDataGrid.svelte';
  import ErrorInfo from '../elements/ErrorInfo.svelte';
  import VerticalSplitter from '../elements/VerticalSplitter.svelte';
  import { showModal } from '../modals/modalTools';
  import SaveArchiveModal from '../modals/SaveArchiveModal.svelte';
  import { currentArchive, selectedWidget } from '../stores';
  import { apiCall } from '../utility/api';
  import createActivator, { getActiveComponent } from '../utility/createActivator';
  import { useConnectionInfo } from '../utility/metadataLoaders';
  import { extensions } from '../stores';
  import ChartCore from '../charts/ChartCore.svelte';
  import LoadingInfo from '../elements/LoadingInfo.svelte';
  import randomcolor from 'randomcolor';

  export const activator = createActivator('ProfilerTab', true);

  export let conid;
  export let database;
  export let engine;
  export let jslidLoad;

  let jslidSession;

  let isProfiling = false;
  let sessionId;
  let isLoadingChart = false;

  let intervalId;
  let chartData;

  $: connection = useConnectionInfo({ conid });
  $: driver = findEngineDriver(engine || $connection, $extensions);
  $: jslid = jslidSession || jslidLoad;

  onMount(() => {
    intervalId = setInterval(() => {
      if (sessionId) {
        apiCall('sessions/ping', {
          sesid: sessionId,
        });
      }
    }, 15 * 1000);
  });

  $: {
    if (jslidLoad && driver) {
      loadChart();
    }
  }

  onDestroy(() => {
    clearInterval(intervalId);
  });

  export async function startProfiling() {
    isProfiling = true;

    let sesid = sessionId;
    if (!sesid) {
      const resp = await apiCall('sessions/create', {
        conid,
        database,
      });
      sesid = resp.sesid;
      sessionId = sesid;
    }

    const resp = await apiCall('sessions/start-profiler', {
      sesid,
    });
    jslidSession = resp.jslid;

    invalidateCommands();
  }

  export function startProfilingEnabled() {
    return conid && database && !isProfiling;
  }

  async function loadChart() {
    isLoadingChart = true;

    const colors = randomcolor({
      count: driver.profilerChartMeasures.length,
      seed: 5,
    });

    const data = await apiCall('jsldata/extract-timeline-chart', {
      jslid,
      timestampFunction: driver.profilerTimestampFunction,
      aggregateFunction: driver.profilerChartAggregateFunction,
      measures: driver.profilerChartMeasures,
    });
    chartData = {
      ...data,
      labels: data.labels.map(x => new Date(x)),
      datasets: data.datasets.map((x, i) => ({
        ...x,
        borderColor: colors[i],
      })),
    };
    isLoadingChart = false;
  }

  export async function stopProfiling() {
    isProfiling = false;
    await apiCall('sessions/stop-profiler', { sesid: sessionId });
    await apiCall('sessions/kill', { sesid: sessionId });
    sessionId = null;

    invalidateCommands();

    loadChart();
  }

  export function stopProfilingEnabled() {
    return conid && database && isProfiling;
  }

  export function saveEnabled() {
    return !!jslidSession;
  }

  async function doSave(folder, file) {
    await apiCall('archive/save-jsl-data', { folder, file, jslid });
    currentArchive.set(folder);
    selectedWidget.set('archive');
  }

  export function save() {
    showModal(SaveArchiveModal, {
      //   folder: archiveFolder,
      //   file: archiveFile,
      onSave: doSave,
    });
  }

  // const data = [
  //   { year: 2010, count: 10 },
  //   { year: 2011, count: 20 },
  //   { year: 2012, count: 15 },
  //   { year: 2013, count: 25 },
  //   { year: 2014, count: 22 },
  //   { year: 2015, count: 30 },
  //   { year: 2016, count: 28 },
  // ];
  // {
  //   labels: data.map(row => row.year),
  //   datasets: [
  //     {
  //       label: 'Acquisitions by year',
  //       data: data.map(row => row.count),
  //     },
  //   ],
  // }
</script>

<ToolStripContainer>
  {#if jslid}
    <VerticalSplitter allowCollapseChild1 allowCollapseChild2>
      <svelte:fragment slot="1">
        {#key jslid}
          <JslDataGrid {jslid} listenInitializeFile formatterFunction={driver?.profilerFormatterFunction} />
        {/key}
      </svelte:fragment>
      <svelte:fragment slot="2">
        {#if isLoadingChart}
          <LoadingInfo wrapper message="Loading chart" />
        {:else}
          <ChartCore
            title="Profile data"
            data={chartData}
            options={{
              maintainAspectRatio: false,
              scales: {
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
              },
            }}
          />
        {/if}
      </svelte:fragment>
    </VerticalSplitter>
  {:else}
    <ErrorInfo message="Profiler not yet started" alignTop />
  {/if}

  <svelte:fragment slot="toolstrip">
    <ToolStripCommandButton command="profiler.start" />
    <ToolStripCommandButton command="profiler.stop" />
    <ToolStripCommandButton command="profiler.save" />
  </svelte:fragment>
</ToolStripContainer>
