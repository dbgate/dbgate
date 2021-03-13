<script lang="ts">
  import moment from 'moment';
  import HorizontalSplitter from '../elements/HorizontalSplitter.svelte';
  import LargeButton from '../elements/LargeButton.svelte';
  import VerticalSplitter from '../elements/VerticalSplitter.svelte';

  import FormProvider from '../forms/FormProvider.svelte';
  import FormTextField from '../forms/FormTextField.svelte';
  import LargeFormButton from '../forms/LargeFormButton.svelte';
  import FontIcon from '../icons/FontIcon.svelte';
  import createImpExpScript from '../impexp/createImpExpScript';
  import ImportExportConfigurator from '../impexp/ImportExportConfigurator.svelte';
  import { getDefaultFileFormat } from '../plugins/fileformats';
  import RunnerOutputFiles from '../query/RunnerOutputFiles';
  import SocketMessageView from '../query/SocketMessageView.svelte';
  import { currentArchive, extensions, selectedWidget } from '../stores';
  import axiosInstance from '../utility/axiosInstance';
  import openNewTab from '../utility/openNewTab';
  import socket from '../utility/socket';
  import useEffect from '../utility/useEffect';
  import WidgetColumnBar from '../widgets/WidgetColumnBar.svelte';
  import WidgetColumnBarItem from '../widgets/WidgetColumnBarItem.svelte';
  import ModalBase from './ModalBase.svelte';
  import { closeCurrentModal } from './modalTools';

  let busy = false;
  let executeNumber = 0;
  let runnerId = null;
  let previewReader = null;

  export let initialValues;
  export let uploadedFile = undefined;
  export let openedFile = undefined;
  export let importToArchive = false;

  const refreshArchiveFolderRef = { current: null };

  $: targetArchiveFolder = importToArchive ? `import-${moment().format('YYYY-MM-DD-hh-mm-ss')}` : $currentArchive;

  $: effect = useEffect(() => registerRunnerDone(runnerId));

  function registerRunnerDone(rid) {
    if (rid) {
      socket.on(`runner-done-${rid}`, handleRunnerDone);
      return () => {
        socket.off(`runner-done-${rid}`, handleRunnerDone);
      };
    } else {
      return () => {};
    }
  }

  $: $effect;

  const handleRunnerDone = () => {
    busy = false;
    if (refreshArchiveFolderRef.current) {
      axiosInstance.post('archive/refresh-folders', {});
      axiosInstance.post('archive/refresh-files', { folder: refreshArchiveFolderRef.current });
      $currentArchive = refreshArchiveFolderRef.current;
      $selectedWidget = 'archive';
    }
  };

  const handleGenerateScript = async e => {
    closeCurrentModal();
    const code = await createImpExpScript($extensions, e.detail);
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
    const values = e.detail;
    busy = true;
    const script = await createImpExpScript($extensions, values);
    executeNumber += 1;
    let runid = runnerId;
    const resp = await axiosInstance.post('runners/start', { script });
    runid = resp.data.runid;
    runnerId = runid;

    if (values.targetStorageType == 'archive') {
      refreshArchiveFolderRef.current = values.targetArchiveFolder;
    } else {
      refreshArchiveFolderRef.current = null;
    }
  };

  const handleCancel = () => {
    axiosInstance.post('runners/cancel', {
      runid: runnerId,
    });
  };
</script>

<FormProvider
  initialValues={{
    sourceStorageType: 'database',
    targetStorageType: importToArchive ? 'archive' : getDefaultFileFormat($extensions).storageType,
    sourceArchiveFolder: $currentArchive,
    targetArchiveFolder,
    ...initialValues,
  }}
>
  <ModalBase {...$$restProps} fullScreen skipBody skipFooter>
    <svelte:fragment slot="header">
      Import/Export
      {#if busy}
        <FontIcon icon="icon loading" />
      {/if}
    </svelte:fragment>

    <div class="wrapper">
      <HorizontalSplitter initialValue="70%">
        <div class="content" slot="1">
          <ImportExportConfigurator {uploadedFile} {openedFile} />
        </div>

        <svelte:fragment slot="2">
          <WidgetColumnBar>
            <WidgetColumnBarItem title="Output files" name="output" height="20%">
              <RunnerOutputFiles {runnerId} {executeNumber} />
            </WidgetColumnBarItem>
            <WidgetColumnBarItem title="Messages" name="messages">
              <SocketMessageView eventName={runnerId ? `runner-info-${runnerId}` : null} {executeNumber} />
            </WidgetColumnBarItem>
            {#if previewReader}
              <WidgetColumnBarItem title="Preview" name="preview">
                <!-- <PreviewDataGrid reader={previewReader} /> -->
              </WidgetColumnBarItem>
            {/if}
            <WidgetColumnBarItem title="Advanced configuration" name="config" collapsed>
              <FormTextField label="Schedule" name="schedule" />
              <FormTextField label="Start variable index" name="startVariableIndex" />
            </WidgetColumnBarItem>
          </WidgetColumnBar>
        </svelte:fragment>
      </HorizontalSplitter>
    </div>

    <div class="footer">
      <div class="flex m-2">
        {#if busy}
          <LargeButton icon="icon close" on:click={handleCancel}>Cancel</LargeButton>
        {:else}
          <LargeFormButton on:click={handleExecute} icon="icon run">Run</LargeFormButton>
        {/if}
        <LargeFormButton icon="img sql-file" on:click={handleGenerateScript}>Generate script</LargeFormButton>

        <LargeButton on:click={closeCurrentModal} icon="icon close">Close</LargeButton>
      </div>
    </div>
  </ModalBase>
</FormProvider>

<style>
  .wrapper {
    display: flex;

    position: fixed;
    top: 60px;
    left: 0;
    right: 0;
    bottom: 100px;
  }
  .footer {
    position: fixed;
    height: 100px;
    left: 0;
    right: 0;
    bottom: 0px;
    border-top: 1px solid var(--theme-border);
    background-color: var(--theme-bg-modalheader);
  }

  .content {
    border-top: 1px solid var(--theme-border);
    flex: 1;
    display: flex;
    flex-direction: column;
    overflow-y: auto;
    overflow-x: hidden;
  }
</style>
