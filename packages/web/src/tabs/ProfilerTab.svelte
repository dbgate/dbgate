<script lang="ts" context="module">
  export const matchingProps = ['conid', 'database', 'pureName', 'sql'];

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

  export const activator = createActivator('ProfilerTab', true);

  export let conid;
  export let database;
  export let jslid;
  export let formatterFunction;

  let profiling = false;
  let sessionId;

  let intervalId;

  $: connection = useConnectionInfo({ conid });
  $: engine = findEngineDriver($connection, $extensions);

  onMount(() => {
    intervalId = setInterval(() => {
      if (sessionId) {
        apiCall('sessions/ping', {
          sesid: sessionId,
        });
      }
    }, 15 * 1000);
  });

  onDestroy(() => {
    clearInterval(intervalId);
  });

  export function isProfiling() {
    return profiling;
  }

  export async function startProfiling() {
    profiling = true;

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
    jslid = resp.jslid;

    invalidateCommands();
  }

  export function startProfilingEnabled() {
    return conid && database && !isProfiling;
  }

  export function stopProfiling() {
    profiling = false;
    apiCall('sessions/stop-profiler', { sesid: sessionId });

    invalidateCommands();
  }

  export function stopProfilingEnabled() {
    return conid && database && isProfiling;
  }

  export function saveEnabled() {
    return !!jslid;
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
</script>

<ToolStripContainer>
  {#if jslid}
    <JslDataGrid
      {jslid}
      listenInitializeFile
      formatterFunction={formatterFunction || engine?.profilerFormatterFunction}
    />
  {:else}
    <ErrorInfo message="Profiler not yet started" alignTop />
  {/if}

  <!-- <VerticalSplitter>
    <svelte:fragment slot="1">
      {#if jslid}
        <JslDataGrid {jslid} listenInitializeFile />
      {/if}
    </svelte:fragment>
    <svelte:fragment slot="2">DETAIL</svelte:fragment>
  </VerticalSplitter> -->
  <svelte:fragment slot="toolstrip">
    <ToolStripCommandButton command="profiler.start" />
    <ToolStripCommandButton command="profiler.stop" />
    <ToolStripCommandButton command="profiler.save" />
  </svelte:fragment>
</ToolStripContainer>
