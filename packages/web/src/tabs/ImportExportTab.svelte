<script lang="ts" context="module">
  const getCurrentEditor = () => getActiveComponent('ImportExportTab');

  registerFileCommands({
    idPrefix: 'job',
    category: 'Job',
    getCurrentEditor,
    folder: 'jobs',
    format: 'json',
    fileExtension: 'job',

    // undoRedo: true,
  });
</script>

<script lang="ts">
  import moment from 'moment';
  import { writable } from 'svelte/store';
  import HorizontalSplitter from '../elements/HorizontalSplitter.svelte';
  import LoadingInfo from '../elements/LoadingInfo.svelte';

  import FormTextField from '../forms/FormTextField.svelte';
  import createImpExpScript from '../impexp/createImpExpScript';
  import ImportExportConfigurator from '../impexp/ImportExportConfigurator.svelte';
  import PreviewDataGrid from '../impexp/PreviewDataGrid.svelte';
  import { getDefaultFileFormat } from '../plugins/fileformats';
  import RunnerOutputFiles from '../query/RunnerOutputFiles.svelte';
  import SocketMessageView from '../query/SocketMessageView.svelte';
  import {
    currentArchive,
    currentDatabase,
    extensions,
    visibleWidgetSideBar,
    selectedWidget,
    activeTabId,
  } from '../stores';
  import { apiCall, apiOff, apiOn } from '../utility/api';
  import createRef from '../utility/createRef';
  import openNewTab from '../utility/openNewTab';
  import useEffect from '../utility/useEffect';
  import WidgetColumnBar from '../widgets/WidgetColumnBar.svelte';
  import WidgetColumnBarItem from '../widgets/WidgetColumnBarItem.svelte';
  import useEditorData from '../query/useEditorData';
  import ToolStripContainer from '../buttons/ToolStripContainer.svelte';
  import ToolStripButton from '../buttons/ToolStripButton.svelte';
  import FormProviderCore from '../forms/FormProviderCore.svelte';
  import { changeTab } from '../utility/common';
  import _ from 'lodash';
  import createActivator, { getActiveComponent } from '../utility/createActivator';
  import { registerFileCommands } from '../commands/stdCommands';
  import ToolStripCommandButton from '../buttons/ToolStripCommandButton.svelte';
  import ToolStripSaveButton from '../buttons/ToolStripSaveButton.svelte';

  let busy = false;
  let executeNumber = 0;
  let runnerId = null;

  const previewReaderStore = writable(null);

  export let tabid;
  export let uploadedFile = undefined;
  export let openedFile = undefined;
  export let importToCurrentTarget = false;

  export let savedFile;
  export let savedFilePath;

  let progressHolder = null;
  const refreshArchiveFolderRef = createRef(null);

  const formValues = writable({});

  let domConfigurator;

  export const activator = createActivator('ImportExportTab', true);

  // const formValues = writable({
  //   sourceStorageType: 'database',
  //   targetStorageType: getDefaultFileFormat($extensions).storageType,
  //   targetArchiveFolder: $currentArchive,
  //   sourceArchiveFolder: $currentArchive,
  //   ...detectCurrentTarget(),
  //   ...initialValues,
  // });

  const { editorState, editorValue, setEditorData } = useEditorData({
    tabid,
    onInitialData: value => {
      $formValues = {
        sourceStorageType: 'database',
        targetStorageType: getDefaultFileFormat($extensions).storageType,
        targetArchiveFolder: $currentArchive,
        sourceArchiveFolder: $currentArchive,
        ...detectCurrentTarget(),
        ...value,
      };

      if (uploadedFile) {
        domConfigurator.addUploadedFile(uploadedFile);
      }
      if (openedFile) {
        domConfigurator.addUploadedFile(openedFile);
      }

      changeTab(tabid, tab => ({
        ...tab,
        props: _.omit(tab.props, ['uploadedFile', 'openedFile', 'importToCurrentTarget']),
      }));
    },
  });

  // $: console.log('formValues', $formValues);

  $: setEditorData($formValues);

  $: updateTabTitle($formValues);

  function detectCurrentTarget() {
    if (!importToCurrentTarget) return {};

    if ($currentDatabase && $selectedWidget != 'archive') {
      return {
        targetStorageType: 'database',
        targetConnectionId: $currentDatabase?.connection?._id,
        targetDatabaseName: $currentDatabase?.name,
      };
    }

    if ($currentArchive == 'default') {
      return {
        targetStorageType: 'archive',
        targetArchiveFolder: `import-${moment().format('YYYY-MM-DD-hh-mm-ss')}`,
      };
    } else {
      return {
        targetStorageType: 'archive',
        targetArchiveFolder: $currentArchive,
      };
    }
  }

  $: effectRunner = useEffect(() => registerRunnerDone(runnerId));

  function registerRunnerDone(rid) {
    if (rid) {
      apiOn(`runner-done-${rid}`, handleRunnerDone);
      return () => {
        apiOff(`runner-done-${rid}`, handleRunnerDone);
      };
    } else {
      return () => {};
    }
  }

  $: $effectRunner;

  const handleRunnerDone = () => {
    busy = false;
    if (refreshArchiveFolderRef.get()) {
      apiCall('archive/refresh-folders', {});
      apiCall('archive/refresh-files', { folder: refreshArchiveFolderRef.get() });
      $currentArchive = refreshArchiveFolderRef.get();
      $selectedWidget = 'archive';
      $visibleWidgetSideBar = true;
    }
  };

  const handleGenerateScript = async e => {
    const values = $formValues as any;
    const code = await createImpExpScript($extensions, values, true);
    openNewTab(
      {
        title: 'Shell #',
        icon: 'img shell',
        tabComponent: 'ShellTab',
      },
      { editor: code }
    );
  };

  const handleExecute = async e => {
    if (busy) return;
    progressHolder = {};
    const values = $formValues as any;
    busy = true;
    const script = await createImpExpScript($extensions, values);
    executeNumber += 1;
    let runid = runnerId;
    const resp = await apiCall('runners/start', { script });
    runid = resp.runid;
    runnerId = runid;

    if (values.targetStorageType == 'archive') {
      refreshArchiveFolderRef.set(values.targetArchiveFolder);
    } else {
      refreshArchiveFolderRef.set(null);
    }
  };

  const handleCancel = () => {
    apiCall('runners/cancel', {
      runid: runnerId,
    });
  };

  export function getData() {
    return $editorState.value || '';
  }

  function getSourceTargetTitle(prefix, values) {
    switch (values[`${prefix}StorageType`]) {
      case 'database':
        return values[`${prefix}DatabaseName`] || 'DB';
      case 'archive':
        return values[`${prefix}ArchiveFolder`] || 'Archive';
      case 'query':
        return 'Query';
      default:
        return values[`${prefix}StorageType`]?.toUpperCase().replace(/@.*$/, '');
    }
  }

  function updateTabTitle(values) {
    if (savedFile || savedFilePath) {
      return;
    }

    changeTab(tabid, tab => ({
      ...tab,
      title: `${getSourceTargetTitle('source', values)}->${getSourceTargetTitle('target', values)}(${values.sourceList?.length || 0})`,
    }));
  }

  const handleProgress = progress => {
    progressHolder = {
      ...progressHolder,
      [progress.progressName]: {
        ...progressHolder[progress.progressName],
        ...progress,
      },
    };
  };

  $: progressEffect = useEffect(() => {
    if (runnerId) {
      const eventName = `runner-progress-${runnerId}`;
      apiOn(eventName, handleProgress);
      return () => {
        apiOff(eventName, handleProgress);
      };
    }
    return () => {};
  });

  $progressEffect;
</script>

<ToolStripContainer>
  <FormProviderCore values={formValues}>
    <HorizontalSplitter initialValue="70%">
      <div class="content" slot="1">
        <ImportExportConfigurator
          bind:this={domConfigurator}
          {previewReaderStore}
          {progressHolder}
          isTabActive={tabid == $activeTabId}
          isRunning={busy}
        />

        {#if busy}
          <LoadingInfo wrapper message="Processing import/export ..." />
        {/if}
      </div>

      <svelte:fragment slot="2">
        <WidgetColumnBar>
          <WidgetColumnBarItem
            title="Output files"
            name="output"
            height="20%"
            data-testid="ImportExportTab_outputFiles"
          >
            <RunnerOutputFiles {runnerId} {executeNumber} />
          </WidgetColumnBarItem>
          <WidgetColumnBarItem title="Messages" name="messages">
            <SocketMessageView
              eventName={runnerId ? `runner-info-${runnerId}` : null}
              {executeNumber}
              showNoMessagesAlert
              showCaller
            />
          </WidgetColumnBarItem>
          <WidgetColumnBarItem
            title="Preview"
            name="preview"
            skip={!$previewReaderStore}
            data-testid="ImportExportTab_preview"
          >
            <PreviewDataGrid reader={$previewReaderStore} />
          </WidgetColumnBarItem>
          <WidgetColumnBarItem title="Advanced configuration" name="config" collapsed>
            <FormTextField label="Schedule" name="schedule" />
            <FormTextField label="Start variable index" name="startVariableIndex" />
          </WidgetColumnBarItem>
        </WidgetColumnBar>
      </svelte:fragment>
    </HorizontalSplitter>
  </FormProviderCore>
  <svelte:fragment slot="toolstrip">
    {#if busy}
      <ToolStripButton icon="icon stop" on:click={handleCancel} data-testid="ImportExportTab_stopButton"
        >Stop</ToolStripButton
      >
    {:else}
      <ToolStripButton on:click={handleExecute} icon="icon run" data-testid="ImportExportTab_executeButton"
        >Run</ToolStripButton
      >
    {/if}
    <ToolStripButton icon="img shell" on:click={handleGenerateScript} data-testid="ImportExportTab_generateScriptButton"
      >Generate script</ToolStripButton
    >
    <ToolStripSaveButton idPrefix="job" />
  </svelte:fragment>
</ToolStripContainer>

<style>
  .content {
    flex: 1;
    display: flex;
    flex-direction: column;
    overflow-y: auto;
    overflow-x: hidden;
    background-color: var(--theme-bg-0);
  }
</style>
